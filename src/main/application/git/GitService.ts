import { dirname, basename } from 'node:path'
import type { GitLineChange, GitStatusDto } from '@shared/git'
import type { Id } from '@shared/models'
import { joinVPath, type VPath } from '@shared/vfs'
import { AppError } from '../errors'
import type { EventPublisher } from '../ports'
import type { VirtualFileSystem } from '../vfs/VirtualFileSystem'
import type { GitCli } from './ports'
import { parsePorcelainV2 } from './porcelain'
import { revertHunkText } from './revertHunk'
import { parseUnifiedDiff } from './unifiedDiff'

export interface GitServiceDeps {
  vfs: VirtualFileSystem
  cli: GitCli
  events: EventPublisher
  /** Desktops that have a Code window open (the 5 s poll only runs for them). */
  codeDesktops: () => Id[]
  /** Poll interval in ms (default 5000); 0 disables the poll. */
  pollMs?: number
  /** Debounce of `git.changed` in ms (default 150). */
  debounceMs?: number
}

/**
 * Git awareness of the Code app. Works on any drive: VPaths are mapped to real paths through the
 * VirtualFileSystem, the `git` CLI runs read only (except `revertHunk`), and every failure
 * (git missing, not a repository, unborn HEAD) degrades to "no git information".
 */
export class GitService {
  private timer: ReturnType<typeof setInterval> | null = null
  private readonly pending = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(private readonly deps: GitServiceDeps) {}

  // ---- queries -----------------------------------------------------------------------------------

  async status(desktopId: Id, root: VPath): Promise<GitStatusDto | null> {
    const real = await this.safeReal(desktopId, root)
    if (real === null) return null
    const prefix = await this.deps.cli.run(real, ['rev-parse', '--show-prefix'])
    if (!prefix.ok) return null
    const out = await this.deps.cli.run(real, ['status', '--porcelain=v2', '-z', '--branch', '--untracked-files=all'])
    if (!out.ok) return null
    const raw = parsePorcelainV2(out.stdout)
    const base = prefix.stdout.trim() // path of `real` below the repository root, '' or 'sub/dir/'
    const toVPath = (rel: string): VPath | null => {
      if (base !== '' && !rel.startsWith(base)) return null
      return joinVPath(root, ...rel.slice(base.length).split('/').filter(Boolean))
    }
    const entries: GitStatusDto['entries'] = []
    for (const e of raw.entries) {
      const path = toVPath(e.path)
      if (path === null) continue
      const origPath = e.origPath === undefined ? undefined : (toVPath(e.origPath) ?? undefined)
      entries.push({ path, index: e.index, worktree: e.worktree, ...(origPath ? { origPath } : {}) })
    }
    return { branch: raw.branch, ahead: raw.ahead, behind: raw.behind, entries }
  }

  async headText(desktopId: Id, path: VPath): Promise<string | null> {
    const file = await this.safeReal(desktopId, path)
    if (file === null) return null
    const out = await this.deps.cli.run(dirname(file), ['show', `HEAD:./${basename(file)}`])
    return out.ok ? out.stdout : null
  }

  async lineChanges(desktopId: Id, path: VPath): Promise<GitLineChange[]> {
    const file = await this.safeReal(desktopId, path)
    if (file === null) return []
    const cwd = dirname(file)
    const name = basename(file)
    if (!(await this.deps.cli.run(cwd, ['rev-parse', '--show-prefix'])).ok) return []
    const head = await this.deps.cli.run(cwd, ['cat-file', '-e', `HEAD:./${name}`])
    if (!head.ok) {
      // Not in HEAD: untracked or newly added is one added hunk; ignored files have no changes.
      if ((await this.deps.cli.run(cwd, ['check-ignore', '-q', '--', name])).ok) return []
      let text: string
      try {
        text = await this.deps.vfs.readFile(desktopId, path)
      } catch {
        return []
      }
      if (text === '') return []
      const total = (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n').length
      return [{ kind: 'added', start: 1, end: total, oldLines: [], ...(text.endsWith('\n') ? {} : { noEolNew: true }) }]
    }
    const diff = await this.deps.cli.run(cwd, ['diff', '--no-color', '--no-ext-diff', '--no-textconv', '--ignore-submodules', '-U0', 'HEAD', '--', name])
    return diff.ok ? parseUnifiedDiff(diff.stdout) : []
  }

  async revertHunk(desktopId: Id, path: VPath, hunkIndex: number): Promise<void> {
    const hunk = (await this.lineChanges(desktopId, path))[hunkIndex]
    if (!hunk) throw new AppError('That change no longer exists. The file was modified in the meantime.')
    const text = await this.deps.vfs.readFile(desktopId, path)
    await this.deps.vfs.writeFile(desktopId, path, revertHunkText(text, hunk))
    this.touched(desktopId, path)
  }

  // ---- change notifications ---------------------------------------------------------------------------

  /** Something in the repository of the drive of `path` changed (user save, agent edit): push `git.changed`, debounced. */
  touched(desktopId: Id, path: VPath): void {
    try {
      const { mount } = this.deps.vfs.locate(desktopId, path)
      this.schedule(desktopId, this.deps.vfs.vpathOf(mount, ''))
    } catch {
      /* unknown or ejected drive: nothing to refresh */
    }
  }

  /** Every project drive of the desktop may have changed. */
  touchedDesktop(desktopId: Id): void {
    for (const mount of this.deps.vfs.mounts(desktopId)) if (mount.kind === 'removable') this.schedule(desktopId, this.deps.vfs.vpathOf(mount, ''))
  }

  /** Starts the poll: every 5 s a `git.changed` for each drive of the desktops that have a Code window open. */
  start(): void {
    const every = this.deps.pollMs ?? 5000
    if (this.timer || every <= 0) return
    this.timer = setInterval(() => {
      for (const desktopId of this.deps.codeDesktops()) this.touchedDesktop(desktopId)
    }, every)
    this.timer.unref?.()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    for (const t of this.pending.values()) clearTimeout(t)
    this.pending.clear()
  }

  // ---- internals -----------------------------------------------------------------------------------

  private schedule(desktopId: Id, root: VPath): void {
    const key = `${desktopId}|${root}`
    if (this.pending.has(key)) return
    this.pending.set(
      key,
      setTimeout(() => {
        this.pending.delete(key)
        this.deps.events.publish('git.changed', { desktopId, root })
      }, this.deps.debounceMs ?? 150)
    )
  }

  /** The real path, or null for invalid paths and ejected drives (git answers "nothing" for them). */
  private async safeReal(desktopId: Id, path: VPath): Promise<string | null> {
    try {
      return await this.deps.vfs.realPath(desktopId, path)
    } catch {
      return null
    }
  }
}
