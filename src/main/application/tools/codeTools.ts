import type { AppView } from '@shared/desktop'
import type { FileChangeDto, Id } from '@shared/models'
import { textSearchSummary } from '@shared/search'
import type { VPath } from '@shared/vfs'
import { AppError } from '../errors'
import type { FileSearch } from '../vfs/FileSearch'
import type { VirtualFileSystem } from '../vfs/VirtualFileSystem'
import type { ToolHandlers } from './catalog'
import type { AgentFileWriter, DesktopOps } from './ports'
import type { ToolPaths } from './ToolPaths'
import { attempt, textResult, type ToolContext } from './types'
import { pickWindow } from './windows'

export interface CodeToolsDeps {
  desktops: DesktopOps
  changes: { list(sessionId: Id): FileChangeDto[] }
  paths: ToolPaths
  vfs: Pick<VirtualFileSystem, 'readFile' | 'readBytes'>
  search: Pick<FileSearch, 'searchText'>
  files: AgentFileWriter
}

type CodeView = Extract<AppView, { app: 'code' }>
type CodeTool = 'code_open' | 'code_reveal' | 'code_show_diff' | 'code_read' | 'code_search' | 'code_edit' | 'code_write'

const VIEW_CONTEXT_LINES = 5
const VIEW_HEIGHT = 30
/** Lines code_read returns at most in one call. */
export const MAX_READ_LINES = 2000
/** Characters of one line that code_read returns (a minified bundle is one huge line). */
export const MAX_READ_LINE_CHARS = 2000
/** Characters one code_read returns at most; past it the result says where to read on. */
export const MAX_READ_CHARS = 100_000

/** Cuts a line to MAX_READ_LINE_CHARS and says how much was left out. */
const clipLine = (line: string): string =>
  line.length <= MAX_READ_LINE_CHARS ? line : `${line.slice(0, MAX_READ_LINE_CHARS)} [... ${line.length - MAX_READ_LINE_CHARS} more characters]`

/**
 * Shows `file` in the Code app for the operator (code_open, code_reveal; `show` replaces them in a later release). An
 * agent open goes through `openOutputWindow`: a new Code window opens behind the focused window, an open one is reused
 * where it is. `selection` selects lines; `changeId` picks a recorded change.
 */
async function showFile(
  desktops: DesktopOps,
  context: ToolContext,
  file: VPath | undefined,
  options: { selection?: CodeView['selection']; changeId?: Id } = {}
): Promise<void> {
  const window = await desktops.openOutputWindow(context.sessionId, { desktopId: context.desktopId, app: 'code', ...(file ? { path: file } : {}) })
  const view = pickWindow(desktops.state(context.desktopId), 'code', window.id).view
  const selection = options.selection ?? null
  const first = selection ? Math.max(1, selection.startLine - VIEW_CONTEXT_LINES) : null
  desktops.updateView(window.id, {
    ...view,
    ...(file
      ? {
          tabs: view.tabs.includes(file) ? view.tabs : [...view.tabs, file],
          activePath: file,
          selection,
          visibleLines: first === null ? null : [first, first + VIEW_HEIGHT]
        }
      : {}),
    ...(options.changeId !== undefined ? { selectedChangeId: options.changeId } : {})
  })
}

/**
 * Work, live where open: when a Code window already shows `file` as its active file, the changed lines get a short
 * highlight (the window reloads the file by itself). Nothing opens, and no tab, active file or window changes.
 */
function highlightIfShowing(desktops: DesktopOps, desktopId: Id, file: VPath, lines: [number, number]): void {
  const window = desktops.state(desktopId).windows.find((w) => w.view.app === 'code' && w.view.activePath?.toLowerCase() === file.toLowerCase())
  if (!window || window.view.app !== 'code') return
  desktops.updateView(window.id, { ...window.view, visibleLines: lines })
}

const numbered = (lines: string[], first: number): string => lines.map((line, i) => `${first + i}\t${line}`).join('\n')

/** How many times `needle` occurs in `text` (not overlapping). */
const occurrences = (text: string, needle: string): number => text.split(needle).length - 1

/** The 1-based line of a character offset. */
const lineAt = (text: string, offset: number): number => text.slice(0, offset).split('\n').length

/**
 * code_read, code_search, code_edit, code_write: Work, headless (no window opens or moves). code_open, code_reveal and
 * code_show_diff show the operator something in the Code app.
 */
export function createCodeTools({ desktops, changes, paths, vfs, search, files }: CodeToolsDeps): ToolHandlers<CodeTool> {
  const changeOf = (sessionId: Id, file: VPath): FileChangeDto | undefined => changes.list(sessionId).find((c) => c.path.toLowerCase() === file.toLowerCase())

  /**
   * The text of a file that code_edit may change. A binary file or one that is not UTF-8 (Windows-1252, UTF-16) is refused:
   * reading it as UTF-8 would turn every other non-ASCII byte into U+FFFD on save, and Revert could not bring them back.
   */
  const editableText = async (desktopId: Id, file: VPath): Promise<string> => {
    const bytes = await vfs.readBytes(desktopId, file)
    if (bytes.subarray(0, 8000).includes(0)) throw new AppError(`${file} is a binary file, not text; code_edit cannot change it.`)
    try {
      return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
    } catch {
      throw new AppError(`${file} is not UTF-8 text (it may be Windows-1252 or UTF-16). code_edit would damage its other characters, so it was not changed.`)
    }
  }

  return {
    code_open: ({ path, line }, context) =>
      attempt(async () => {
        const file = paths.resolve(context, path)
        await showFile(desktops, context, file, { selection: line === undefined ? null : { startLine: line, endLine: line } })
        return textResult(`Code shows ${file}${line === undefined ? '' : ` at line ${line}`}.`)
      }),

    code_reveal: ({ path, startLine, endLine }, context) =>
      attempt(async () => {
        const file = paths.resolve(context, path)
        const end = Math.max(startLine, endLine ?? startLine)
        await showFile(desktops, context, file, { selection: { startLine, endLine: end } })
        return textResult(`Code shows ${file}, lines ${startLine}-${end} selected.`)
      }),

    code_show_diff: ({ path }, context) =>
      attempt(async () => {
        const file = paths.resolve(context, path)
        const change = changeOf(context.sessionId, file)
        if (!change) throw new AppError(`There is no recorded change for ${file} in this chat.`)
        await showFile(desktops, context, undefined, { changeId: change.id })
        return textResult(`Code shows the change of ${file}: ${change.kind}, +${change.additions} -${change.deletions}.`)
      }),

    code_read: ({ path, startLine, endLine }, context) =>
      attempt(async () => {
        const file = paths.resolve(context, path)
        const text = await vfs.readFile(context.desktopId, file)
        if (text.slice(0, 8000).includes('\u0000')) throw new AppError(`${file} is a binary file, not text.`)
        const lines = text.split(/\r?\n/)
        if (lines.length > 1 && lines.at(-1) === '') lines.pop()
        const first = startLine ?? 1
        if (first > lines.length) throw new AppError(`${file} has ${lines.length} lines; startLine ${first} is past the end.`)
        let last = Math.min(endLine ?? lines.length, lines.length, first + MAX_READ_LINES - 1)
        if (last < first) throw new AppError('endLine is before startLine.')
        // Stop before the result gets too big for the agent to take in (long lines count as their clipped length).
        let size = 0
        for (let n = first; n <= last; n++) {
          size += Math.min(lines[n - 1]!.length, MAX_READ_LINE_CHARS) + 8
          if (size > MAX_READ_CHARS && n > first) {
            last = n - 1
            break
          }
        }
        const more = last < lines.length ? `\n(${lines.length - last} more lines: read from startLine ${last + 1})` : ''
        return textResult(`${file}, lines ${first}-${last} of ${lines.length}:\n${numbered(lines.slice(first - 1, last).map(clipLine), first)}${more}`)
      }),

    code_search: ({ query, path, regex, matchCase, include, limit }, context) =>
      attempt(async () => {
        const root = paths.resolve(context, path)
        const result = await search.searchText(context.desktopId, root, { query, regex, matchCase, include, limit })
        const lines = result.matches.map((m) => `${m.path}:${m.line}:${m.column}: ${m.text}`)
        return textResult([`${textSearchSummary(result)} (searched ${result.filesSearched} files below ${root}).`, ...lines].join('\n'))
      }),

    code_edit: ({ path, oldText, newText, replaceAll }, context) =>
      attempt(async () => {
        const { desktopId, sessionId } = context
        const file = paths.resolve(context, path)
        const before = await editableText(desktopId, file)
        // code_read shows lines without their \r: in a file with Windows line endings, the agent's text gets them back.
        if (before.includes('\r\n') && !oldText.includes('\r')) {
          oldText = oldText.replace(/\n/g, '\r\n')
          newText = newText.replace(/\r?\n/g, '\r\n')
        }
        const count = occurrences(before, oldText)
        if (count === 0) throw new AppError(`oldText was not found in ${file}. Read the file (code_read) and copy the text exactly, spaces and line breaks too.`)
        if (count > 1 && !replaceAll) throw new AppError(`oldText occurs ${count} times in ${file}. Add more of the surrounding text so it is unique, or set replaceAll.`)
        const at = before.indexOf(oldText)
        const after = replaceAll ? before.split(oldText).join(newText) : before.slice(0, at) + newText + before.slice(at + oldText.length)
        await files.write(sessionId, file, after)
        const startLine = lineAt(after, at)
        const endLine = startLine + Math.max(0, newText.split('\n').length - 1)
        highlightIfShowing(desktops, desktopId, file, [startLine, endLine])
        const where = replaceAll && count > 1 ? `${count} places` : `line${endLine > startLine ? `s ${startLine}-${endLine}` : ` ${startLine}`}`
        return textResult(`Edited ${file} (${where}).`)
      }),

    code_write: ({ path, text }, context) =>
      attempt(async () => {
        const { desktopId, sessionId } = context
        const file = paths.resolve(context, path)
        const existed = await vfs.readFile(desktopId, file).then(
          () => true,
          () => false
        )
        await files.write(sessionId, file, text)
        const lineCount = text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
        return textResult(`${existed ? 'Replaced' : 'Created'} ${file} (${lineCount} lines).`)
      })
  }
}
