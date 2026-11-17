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

/** Case-insensitive match of a file name against a name fragment or a `*` glob. */
export function nameMatcher(pattern: string): (name: string) => boolean {
  const lower = pattern.trim().toLowerCase()
  if (!lower.includes('*')) return (name) => name.toLowerCase().includes(lower)
  const source = lower
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  const regex = new RegExp(`^${source}$`)
  return (name) => regex.test(name.toLowerCase())
}

/** A file name filter from a comma-separated list of names or globs; an empty list lets every file through. */
export function includeMatcher(include: string | undefined): (name: string) => boolean {
  const parts = (include ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p !== '')
  if (parts.length === 0) return () => true
  const matchers = parts.map(nameMatcher)
  return (name) => matchers.some((m) => m(name))
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
    return (line) => {
      const m = regex.exec(line)
      return m && m[0].length > 0 ? { start: m.index, length: m[0].length } : null
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
