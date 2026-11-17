import type { Id } from '@shared/models'
import {
  DEFAULT_FOUND_FILES,
  DEFAULT_TEXT_MATCHES,
  InvalidSearchError,
  MAX_FOUND_FILES,
  MAX_TEXT_MATCHES,
  clipMatchLine,
  includeMatcher,
  lineMatcher,
  nameMatcher,
  pathBelow,
  type FileFindQuery,
  type FileFindResultDto,
  type TextMatchDto,
  type TextSearchQuery,
  type TextSearchResultDto
} from '@shared/search'
import type { VfsEntryDto, VPath } from '@shared/vfs'
import { AppError } from '../errors'
import type { VirtualFileSystem } from './VirtualFileSystem'

/** Folders one search opens at most; past it the search stops and returns what it found, marked as more not shown. */
export const MAX_SEARCHED_DIRECTORIES = 2000
/** Bigger files are skipped when searching contents. */
export const MAX_SEARCHED_FILE_BYTES = 1024 * 1024

const clamp = (value: number | undefined, fallback: number, max: number): number => Math.min(Math.max(1, Math.floor(value ?? fallback)), max)

/** A file is text when its start has no NUL byte. */
const looksBinary = (text: string): boolean => text.slice(0, 8000).includes('\u0000')

/**
 * Find in files and find files, below a folder of one desktop. One code path for the user (the Code app's Search tab,
 * Explorer's Search Companion, over IPC) and the agent (code_search, fs_find). .git and node_modules are skipped.
 */
export class FileSearch {
  constructor(private readonly vfs: Pick<VirtualFileSystem, 'readDir' | 'readFile' | 'stat'>) {}

  async searchText(desktopId: Id, root: VPath, query: TextSearchQuery): Promise<TextSearchResultDto> {
    const match = this.matcher(query)
    const included = includeMatcher(query.include)
    const limit = clamp(query.limit, DEFAULT_TEXT_MATCHES, MAX_TEXT_MATCHES)
    const matches: TextMatchDto[] = []
    let filesSearched = 0
    let filesMatched = 0
    const walk = { capped: false }
    for await (const file of this.files(desktopId, root, walk)) {
      if (!included(file.name, pathBelow(root, file.path))) continue
      const text = await this.textOf(desktopId, file)
      if (text === null) continue
      filesSearched++
      let found = false
      const lines = text.split(/\r?\n/)
      for (let i = 0; i < lines.length; i++) {
        const hit = match(lines[i]!)
        if (!hit) continue
        if (matches.length >= limit) return { matches, filesSearched, filesMatched, truncated: true }
        if (!found) filesMatched++
        found = true
        const clipped = clipMatchLine(lines[i]!, hit.start, hit.length)
        matches.push({ path: file.path, line: i + 1, column: hit.start + 1, length: hit.length, text: clipped.text, textStart: clipped.start })
      }
    }
    return { matches, filesSearched, filesMatched, truncated: walk.capped }
  }

  async find(desktopId: Id, root: VPath, query: FileFindQuery): Promise<FileFindResultDto> {
    const name = query.name?.trim() ?? ''
    const containing = query.containing?.trim() ?? ''
    if (name === '' && containing === '') throw new AppError('Type all or part of the file name, a word or phrase in the file, or both.')
    const named = name === '' ? () => true : nameMatcher(name)
    const inFile = containing === '' ? null : lineMatcher({ query: containing })
    const limit = clamp(query.limit, DEFAULT_FOUND_FILES, MAX_FOUND_FILES)
    const entries: VfsEntryDto[] = []
    const walk = { capped: false }
    for await (const entry of this.walk(desktopId, root, walk)) {
      if (!named(entry.name, pathBelow(root, entry.path))) continue
      if (inFile) {
        // A folder has no words in it.
        if (entry.kind !== 'file') continue
        const text = await this.textOf(desktopId, entry)
        if (text === null || !text.split(/\r?\n/).some((line) => inFile(line) !== null)) continue
      }
      if (entries.length >= limit) return { entries, truncated: true }
      entries.push(entry)
    }
    return { entries, truncated: walk.capped }
  }

  private matcher(query: TextSearchQuery): ReturnType<typeof lineMatcher> {
    try {
      return lineMatcher(query)
    } catch (error) {
      if (error instanceof InvalidSearchError) throw new AppError(error.message)
      throw error
    }
  }

  /** The text of a file, or null for a big or binary file (or one that cannot be read). */
  private async textOf(desktopId: Id, file: VfsEntryDto): Promise<string | null> {
    if (file.size !== null && file.size > MAX_SEARCHED_FILE_BYTES) return null
    const text = await this.vfs.readFile(desktopId, file.path).catch(() => null)
    return text === null || looksBinary(text) ? null : text
  }

  /** The files below `root`, or `root` itself when it is a file. */
  private async *files(desktopId: Id, root: VPath, outcome: { capped: boolean }): AsyncGenerator<VfsEntryDto> {
    for await (const entry of this.walk(desktopId, root, outcome)) if (entry.kind === 'file') yield entry
  }

  /**
   * Every entry below `root`, breadth first, folders listed before their contents. A folder that cannot be read (a link
   * that leads off the drive, no permission) is skipped, not the whole search. After MAX_SEARCHED_DIRECTORIES folders the
   * walk stops and sets `outcome.capped`, so the caller keeps what it found and says that more may exist.
   */
  private async *walk(desktopId: Id, root: VPath, outcome: { capped: boolean }): AsyncGenerator<VfsEntryDto> {
    const start = await this.vfs.stat(desktopId, root)
    if (!start) throw new AppError(`${root} does not exist.`)
    if (start.kind === 'file') {
      yield start
      return
    }
    const queue: VPath[] = [root]
    let visited = 0
    while (queue.length > 0) {
      if (++visited > MAX_SEARCHED_DIRECTORIES) {
        outcome.capped = true
        return
      }
      const dir = queue.shift()!
      const listed = await this.vfs.readDir(desktopId, dir, { hideIgnored: true }).catch((error: unknown) => {
        if (dir === root) throw error
        return []
      })
      for (const entry of listed) {
        yield entry
        if (entry.kind === 'directory') queue.push(entry.path)
      }
    }
  }
}
