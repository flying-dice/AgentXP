import type { AppView, CodeSearchView } from '@shared/desktop'
import type { FileChangeDto, Id } from '@shared/models'
import { textSearchSummary } from '@shared/search'
import type { VPath } from '@shared/vfs'
import { AppError } from '../errors'
import type { FileSearch } from '../vfs/FileSearch'
import type { VirtualFileSystem } from '../vfs/VirtualFileSystem'
import type { ToolHandlers } from './catalog'
import type { AgentFileWriter, DesktopOps } from './ports'
import type { ToolPaths } from './ToolPaths'
import { attempt, textResult } from './types'
import { pickWindow } from './windows'

export interface CodeToolsDeps {
  desktops: DesktopOps
  changes: { list(sessionId: Id): FileChangeDto[] }
  paths: ToolPaths
  vfs: Pick<VirtualFileSystem, 'readFile'>
  search: Pick<FileSearch, 'searchText'>
  files: AgentFileWriter
}

type CodeView = Extract<AppView, { app: 'code' }>
type CodeTool = 'code_open' | 'code_reveal' | 'code_show_diff' | 'code_read' | 'code_search' | 'code_edit' | 'code_write'

const VIEW_CONTEXT_LINES = 5
const VIEW_HEIGHT = 30
/** Lines code_read returns at most in one call. */
export const MAX_READ_LINES = 2000

/** The singleton Code window (opened by the agent when needed) and its view. */
function codeWindow(desktops: DesktopOps, desktopId: Id, file?: VPath): { id: Id; view: CodeView } {
  const window = desktops.openWindow({ desktopId, app: 'code', ...(file ? { path: file } : {}) }, 'agent')
  return { id: window.id, view: pickWindow(desktops.state(desktopId), 'code', window.id).view }
}

/**
 * Shows `file` in the Code app (opening it when needed). `selection` selects lines; `visibleLines` scrolls to and
 * highlights lines without selecting them (what the agent read or changed). `change` picks a recorded change.
 */
function showFile(
  desktops: DesktopOps,
  desktopId: Id,
  file: VPath,
  options: { selection?: CodeView['selection']; visibleLines?: [number, number] | null; changeId?: Id | null } = {}
): void {
  const { id, view } = codeWindow(desktops, desktopId, file)
  const selection = options.selection ?? null
  const first = selection ? Math.max(1, selection.startLine - VIEW_CONTEXT_LINES) : null
  desktops.updateView(id, {
    ...view,
    tabs: view.tabs.includes(file) ? view.tabs : [...view.tabs, file],
    activePath: file,
    selection,
    visibleLines: options.visibleLines !== undefined ? options.visibleLines : first === null ? null : [first, first + VIEW_HEIGHT],
    ...(options.changeId !== undefined ? { selectedChangeId: options.changeId } : {})
  })
}

const numbered = (lines: string[], first: number): string => lines.map((line, i) => `${first + i}\t${line}`).join('\n')

/** How many times `needle` occurs in `text` (not overlapping). */
const occurrences = (text: string, needle: string): number => text.split(needle).length - 1

/** The 1-based line of a character offset. */
const lineAt = (text: string, offset: number): number => text.slice(0, offset).split('\n').length

/** code_open, code_reveal, code_show_diff, code_read, code_search, code_edit, code_write: the agent works in the Code app. */
export function createCodeTools({ desktops, changes, paths, vfs, search, files }: CodeToolsDeps): ToolHandlers<CodeTool> {
  const changeOf = (sessionId: Id, file: VPath): FileChangeDto | undefined => changes.list(sessionId).find((c) => c.path.toLowerCase() === file.toLowerCase())

  return {
    code_open: ({ path, line }, context) =>
      attempt(() => {
        const file = paths.resolve(context, path)
        showFile(desktops, context.desktopId, file, { selection: line === undefined ? null : { startLine: line, endLine: line } })
        return textResult(`Code shows ${file}${line === undefined ? '' : ` at line ${line}`}.`)
      }),

    code_reveal: ({ path, startLine, endLine }, context) =>
      attempt(() => {
        const file = paths.resolve(context, path)
        const end = Math.max(startLine, endLine ?? startLine)
        showFile(desktops, context.desktopId, file, { selection: { startLine, endLine: end } })
        return textResult(`Code shows ${file}, lines ${startLine}-${end} selected.`)
      }),

    code_show_diff: ({ path }, context) =>
      attempt(() => {
        const { desktopId, sessionId } = context
        const file = paths.resolve(context, path)
        const change = changeOf(sessionId, file)
        if (!change) throw new AppError(`There is no recorded change for ${file} in this chat.`)
        const { id, view } = codeWindow(desktops, desktopId)
        desktops.updateView(id, { ...view, selectedChangeId: change.id })
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
        const last = Math.min(endLine ?? lines.length, lines.length, first + MAX_READ_LINES - 1)
        if (last < first) throw new AppError('endLine is before startLine.')
        const ranged = startLine !== undefined || endLine !== undefined
        // A whole file opens at the top; a range is scrolled to and highlighted.
        showFile(desktops, context.desktopId, file, { visibleLines: ranged ? [first, last] : null })
        const more = last < lines.length ? `\n(${lines.length - last} more lines: read from startLine ${last + 1})` : ''
        return textResult(`${file}, lines ${first}-${last} of ${lines.length}:\n${numbered(lines.slice(first - 1, last), first)}${more}`)
      }),

    code_search: ({ query, path, regex, matchCase, include, limit }, context) =>
      attempt(async () => {
        const root = paths.resolve(context, path)
        const result = await search.searchText(context.desktopId, root, { query, regex, matchCase, include, limit })
        const view: CodeSearchView = { query, root, regex: regex ?? false, matchCase: matchCase ?? false, include: include ?? '', by: 'agent' }
        const { id, view: current } = codeWindow(desktops, context.desktopId)
        desktops.updateView(id, { ...current, search: view })
        const lines = result.matches.map((m) => `${m.path}:${m.line}:${m.column}: ${m.text}`)
        return textResult([`${textSearchSummary(result)} (searched ${result.filesSearched} files below ${root}; the Search tab of Code shows them).`, ...lines].join('\n'))
      }),

    code_edit: ({ path, oldText, newText, replaceAll }, context) =>
      attempt(async () => {
        const { desktopId, sessionId } = context
        const file = paths.resolve(context, path)
        const before = await vfs.readFile(desktopId, file)
        const count = occurrences(before, oldText)
        if (count === 0) throw new AppError(`oldText was not found in ${file}. Read the file (code_read) and copy the text exactly, spaces and line breaks too.`)
        if (count > 1 && !replaceAll) throw new AppError(`oldText occurs ${count} times in ${file}. Add more of the surrounding text so it is unique, or set replaceAll.`)
        const at = before.indexOf(oldText)
        const after = replaceAll ? before.split(oldText).join(newText) : before.slice(0, at) + newText + before.slice(at + oldText.length)
        await files.write(sessionId, file, after)
        const startLine = lineAt(after, at)
        const endLine = startLine + Math.max(0, newText.split('\n').length - 1)
        showFile(desktops, desktopId, file, { visibleLines: [startLine, endLine], changeId: changeOf(sessionId, file)?.id ?? null })
        const where = replaceAll && count > 1 ? `${count} places` : `line${endLine > startLine ? `s ${startLine}-${endLine}` : ` ${startLine}`}`
        return textResult(`Edited ${file} (${where}); Code shows the change.`)
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
        showFile(desktops, desktopId, file, { visibleLines: null, changeId: changeOf(sessionId, file)?.id ?? null })
        const lineCount = text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
        return textResult(`${existed ? 'Replaced' : 'Created'} ${file} (${lineCount} lines); Code shows it.`)
      })
  }
}
