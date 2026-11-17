/**
 * Searching the drives of a desktop: find in files (the Code app's Search tab, code_search) and find files by name
 * and contents (Explorer's Search Companion, fs_find). Pure types and pure matchers only; main walks the drives.
 */
import type { VfsEntryDto, VPath } from './vfs'

/** Find in files: the text to look for and how. */
export interface TextSearchQuery {
  query: string
  /** `query` is a JavaScript regular expression. */
  regex?: boolean
  matchCase?: boolean
  /** Only files whose name matches one of these comma-separated names or `*` globs (`*.ts, *.svelte`). */
  include?: string
  /** Most matching lines to return. */
  limit?: number
}

/** One matching line. `column` is 1-based in the file; `length` is the length of the first match on the line. */
export interface TextMatchDto {
  path: VPath
  line: number
  column: number
  length: number
  /** The line, cut to MAX_MATCH_TEXT characters around the match. */
  text: string
  /** Where the match starts in `text` (0-based), for highlighting. */
  textStart: number
}

export interface TextSearchResultDto {
  matches: TextMatchDto[]
  filesSearched: number
  filesMatched: number
  /** The limit was reached: there are more matches. */
  truncated: boolean
}

/** Find files: by part of the name, by a word or phrase in the file, or both. */
export interface FileFindQuery {
  name?: string
  containing?: string
  limit?: number
}

export interface FileFindResultDto {
  entries: VfsEntryDto[]
  truncated: boolean
}

export const DEFAULT_TEXT_MATCHES = 200
export const MAX_TEXT_MATCHES = 1000
export const DEFAULT_FOUND_FILES = 100
export const MAX_FOUND_FILES = 500
/** Characters of a matching line that are kept. */
export const MAX_MATCH_TEXT = 240

/**
 * Tests a file: its name, and its path below the folder searched (`src\app\a.ts`, either slash), when the caller knows it.
 */
export type FileMatcher = (name: string, relativePath?: string) => boolean

const GLOB_CHARS = /[*?{]/

/** The regular expression source of a glob: `**` any folders, `*` and `?` within one name, `{a,b}` either. */
function globSource(glob: string): string {
  let out = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!
    if (c === '*' && glob[i + 1] === '*') {
      i++
      if (glob[i + 1] === '/') {
        i++
        out += '(?:.*/)?'
      } else out += '.*'
    } else if (c === '*') out += '[^/]*'
    else if (c === '?') out += '[^/]'
    else if (c === '{') {
      const end = glob.indexOf('}', i)
      if (end < 0) out += '\\{'
      else {
        out += `(?:${glob
          .slice(i + 1, end)
          .split(',')
          .map(globSource)
          .join('|')})`
        i = end
      }
    } else out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return out
}

/**
 * Case-insensitive match of a file against a name fragment (`read` finds `README.md`) or a glob: `*.ts`, `test?.js`,
 * `*.{ts,svelte}`, and with a slash, a path below the folder searched: `src/*.ts`, `**\/*.test.ts`.
 */
export function nameMatcher(pattern: string): FileMatcher {
  const lower = pattern.trim().toLowerCase().replace(/\\/g, '/')
  if (!GLOB_CHARS.test(lower)) return (name) => name.toLowerCase().includes(lower)
  const regex = new RegExp(`^${globSource(lower)}$`)
  if (!lower.includes('/')) return (name) => regex.test(name.toLowerCase())
  return (name, relativePath) => regex.test((relativePath ?? name).toLowerCase().replace(/\\/g, '/'))
}

/** Splits `*.{ts,tsx}, *.md` at the commas that are not inside braces. */
function splitPatterns(list: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < list.length; i++) {
    if (list[i] === '{') depth++
    else if (list[i] === '}') depth = Math.max(0, depth - 1)
    else if (list[i] === ',' && depth === 0) {
      parts.push(list.slice(start, i))
      start = i + 1
    }
  }
  parts.push(list.slice(start))
  return parts.map((p) => p.trim()).filter((p) => p !== '')
}

/** A file filter from a comma-separated list of names or globs; an empty list lets every file through. */
export function includeMatcher(include: string | undefined): FileMatcher {
  const parts = splitPatterns(include ?? '')
  if (parts.length === 0) return () => true
  const matchers = parts.map(nameMatcher)
  return (name, relativePath) => matchers.some((m) => m(name, relativePath))
}

/** The path of `path` below the folder `root` (`E:\src`, `E:\src\app\a.ts` -> `app\a.ts`). */
export function pathBelow(root: string, path: string): string {
  const prefix = root.endsWith('\\') ? root : `${root}\\`
  return path.toLowerCase().startsWith(prefix.toLowerCase()) ? path.slice(prefix.length) : path
}

export class InvalidSearchError extends Error {}

/**
 * Finds the first match of `query` in one line: its 0-based start and length, or null. Throws InvalidSearchError for an
 * empty query or a regular expression that does not compile.
 */
export function lineMatcher(query: Pick<TextSearchQuery, 'query' | 'regex' | 'matchCase'>): (line: string) => { start: number; length: number } | null {
  if (query.query === '') throw new InvalidSearchError('Type something to search for.')
  if (query.regex) {
    let regex: RegExp
    try {
      regex = new RegExp(query.query, query.matchCase ? '' : 'i')
    } catch (error) {
      throw new InvalidSearchError(`Not a valid regular expression: ${error instanceof Error ? error.message : String(error)}`)
    }
    // Global, so a line whose first match is empty (`a*` on "baaa") is still searched for a real match further on.
    const global = new RegExp(regex.source, `${regex.flags}g`)
    return (line) => {
      global.lastIndex = 0
      for (let m = global.exec(line); m; m = global.exec(line)) {
        if (m[0].length > 0) return { start: m.index, length: m[0].length }
        global.lastIndex++
      }
      return null
    }
  }
  const needle = query.matchCase ? query.query : query.query.toLowerCase()
  return (line) => {
    const start = (query.matchCase ? line : line.toLowerCase()).indexOf(needle)
    return start < 0 ? null : { start, length: needle.length }
  }
}

/** Cuts a long line to MAX_MATCH_TEXT characters around the match and moves the match start to fit. */
export function clipMatchLine(line: string, start: number, length: number): { text: string; start: number } {
  if (line.length <= MAX_MATCH_TEXT) return { text: line, start }
  const from = Math.max(0, Math.min(start - Math.floor((MAX_MATCH_TEXT - length) / 2), line.length - MAX_MATCH_TEXT))
  return { text: line.slice(from, from + MAX_MATCH_TEXT), start: start - from }
}

/** "3 results in 2 files" (the Search tab's summary line and the tools' first line). */
export function textSearchSummary(result: Pick<TextSearchResultDto, 'matches' | 'filesMatched' | 'truncated'>): string {
  const n = result.matches.length
  if (n === 0) return 'No results.'
  const files = `${result.filesMatched} file${result.filesMatched === 1 ? '' : 's'}`
  return `${n}${result.truncated ? '+' : ''} result${n === 1 ? '' : 's'} in ${files}${result.truncated ? ' (more not shown: narrow the search)' : ''}`
}
