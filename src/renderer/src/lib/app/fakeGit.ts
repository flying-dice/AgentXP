/**
 * In-memory git for Storybook: a sample repository whose HEAD differs from the fake file system, so the Code app
 * shows modified, added, untracked and deleted entries, gutter marks and peeks. `revertHunk` really rewrites the
 * fake file, so the status updates like the real one.
 */
import type { GitApi, GitEntryDto, GitLineChange } from '@shared/git'
import type { VPath, VfsApi } from '@shared/vfs'
import { normaliseVPath } from '@shared/vfs'
import { sampleOld } from '../kit/organisms/stories.samples'

const lines = (text: string): string[] => (text === '' ? [] : (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n'))
const text = (l: string[]): string => (l.length ? l.join('\n') + '\n' : '')

/** Line changes in the shape of `git diff -U0` (new-file numbers) via a longest-common-subsequence diff. */
export function diffToChanges(oldText: string, newText: string): GitLineChange[] {
  const a = lines(oldText)
  const b = lines(newText)
  const n = a.length
  const m = b.length
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
  const out: GitLineChange[] = []
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      i++
      j++
      continue
    }
    const oldLines: string[] = []
    const start = j + 1
    let count = 0
    while ((i < n || j < m) && !(i < n && j < m && a[i] === b[j])) {
      if (i < n && (j >= m || lcs[i + 1][j] >= lcs[i][j + 1])) oldLines.push(a[i++])
      else {
        j++
        count++
      }
    }
    if (count === 0) out.push({ kind: 'deleted', start: start - 1, end: start - 1, oldLines })
    else out.push({ kind: oldLines.length === 0 ? 'added' : 'modified', start, end: start + count - 1, oldLines })
  }
  return out
}

/** The files whose HEAD differs from the sample project (the rest of HEAD equals the working files). */
export function sampleHead(): Record<VPath, string> {
  const indexLines = lines(sampleOld)
  indexLines.splice(5, 0, "  logger.debug('signed in');") // deleted in the working copy
  const redirectLines = lines(sampleOld)
  redirectLines[4] = "  res.redirect('/');" // modified in the working copy
  return {
    'E:\\src\\index.ts': text(indexLines),
    'E:\\src\\auth\\redirect.ts': text(redirectLines),
    'E:\\src\\removed.ts': 'export {}\n'
  }
}

export interface FakeGitOptions {
  vfs: VfsApi
  /** Tracked in the index but not committed (green A). */
  added?: VPath[]
  /** Not tracked at all (U). */
  untracked?: VPath[]
  head?: Record<VPath, string>
  /** Called when something changed (revert), like the real `git.changed`. */
  changed?: (root: VPath) => void
}

export function createFakeGit(options: FakeGitOptions): GitApi {
  const head = options.head ?? sampleHead()
  const added = new Set((options.added ?? ['E:\\src\\auth\\session.ts']).map((p) => normaliseVPath(p) ?? p))
  const untracked = new Set((options.untracked ?? ['E:\\docs\\guide.md']).map((p) => normaliseVPath(p) ?? p))
  const read = async (desktopId: number, path: VPath): Promise<string | null> => options.vfs.readFile(desktopId, path).catch(() => null)

  const changesOf = async (desktopId: number, path: VPath): Promise<GitLineChange[]> => {
    const p = normaliseVPath(path) ?? path
    const working = await read(desktopId, p)
    if (working === null) return []
    if (p in head) return diffToChanges(head[p], working)
    if (added.has(p) || untracked.has(p)) return working === '' ? [] : [{ kind: 'added', start: 1, end: lines(working).length, oldLines: [] }]
    return []
  }

  return {
    status: async (desktopId, root) => {
      if (!root.toUpperCase().startsWith('E:')) return null
      const entries: GitEntryDto[] = []
      for (const [path, headText] of Object.entries(head)) {
        const working = await read(desktopId, path)
        if (working === null) entries.push({ path, index: ' ', worktree: 'D' })
        else if (working !== headText) entries.push({ path, index: ' ', worktree: 'M' })
      }
      for (const path of added) entries.push({ path, index: 'A', worktree: ' ' })
      for (const path of untracked) entries.push({ path, index: '?', worktree: '?' })
      return { branch: 'main', ahead: 1, behind: 2, entries }
    },
    lineChanges: (desktopId, path) => changesOf(desktopId, path),
    headText: async (_desktopId, path) => head[normaliseVPath(path) ?? path] ?? null,
    revertHunk: async (desktopId, path, hunkIndex) => {
      const hunk = (await changesOf(desktopId, path))[hunkIndex]
      const working = await read(desktopId, path)
      if (!hunk || working === null) throw new Error('That change no longer exists.')
      const l = lines(working)
      if (hunk.kind === 'deleted') l.splice(hunk.start, 0, ...hunk.oldLines)
      else l.splice(hunk.start - 1, hunk.end - hunk.start + 1, ...hunk.oldLines)
      await options.vfs.writeFile(desktopId, path, text(l))
      options.changed?.(`${path[0].toUpperCase()}:\\`)
    }
  }
}

