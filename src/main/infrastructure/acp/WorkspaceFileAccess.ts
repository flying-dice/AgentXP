import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type { FileAccess } from '../../domain/agent/FileAccess'
import { PathOutsideSandboxError, resolveInsideRoot } from '../fs/sandbox'

export { PathOutsideSandboxError }

export type WriteListener = (path: string, before: string | null, after: string) => void

/** Text file access confined to one root folder (symlinks included). */
export class WorkspaceFileAccess implements FileAccess {
  private readonly root: string

  constructor(
    root: string,
    private readonly onWrite: WriteListener = () => {}
  ) {
    this.root = resolve(root)
  }

  async readTextFile(path: string, line?: number, limit?: number): Promise<string> {
    const text = await readFile(await resolveInsideRoot(this.root, path), 'utf8')
    return sliceLines(text, line, limit)
  }

  async resolveCwd(cwd?: string): Promise<string> {
    return cwd === undefined ? this.root : resolveInsideRoot(this.root, cwd)
  }

  async writeTextFile(path: string, content: string): Promise<void> {
    const target = await resolveInsideRoot(this.root, path)
    const before = await readFile(target, 'utf8').catch(() => null)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, content, 'utf8')
    this.onWrite(target, before, content)
  }
}

function sliceLines(text: string, line?: number, limit?: number): string {
  if (line === undefined && limit === undefined) return text
  const lines = text.split('\n')
  const start = Math.max((line ?? 1) - 1, 0)
  const end = limit === undefined ? undefined : start + Math.max(limit, 0)
  return lines.slice(start, end).join('\n')
}
