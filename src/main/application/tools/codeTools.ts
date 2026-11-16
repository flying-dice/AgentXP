import type { AppView } from '@shared/desktop'
import type { FileChangeDto, Id } from '@shared/models'
import type { VPath } from '@shared/vfs'
import { AppError } from '../errors'
import type { ToolHandlers } from './catalog'
import type { DesktopOps } from './ports'
import type { ToolPaths } from './ToolPaths'
import { attempt, textResult } from './types'
import { pickWindow } from './windows'

export interface CodeToolsDeps {
  desktops: DesktopOps
  changes: { list(sessionId: Id): FileChangeDto[] }
  paths: ToolPaths
}

type CodeView = Extract<AppView, { app: 'code' }>

const VIEW_CONTEXT_LINES = 5
const VIEW_HEIGHT = 30

/** Shows `path` in the Code app (opening it when needed) with the optional selection. */
function showFile(desktops: DesktopOps, desktopId: Id, file: VPath, selection: CodeView['selection']): void {
  const window = desktops.openWindow({ desktopId, app: 'code', path: file }, 'agent')
  const view = pickWindow(desktops.state(desktopId), 'code', window.id).view
  const tabs = view.tabs.includes(file) ? view.tabs : [...view.tabs, file]
  const first = selection ? Math.max(1, selection.startLine - VIEW_CONTEXT_LINES) : null
  desktops.updateView(window.id, {
    ...view,
    tabs,
    activePath: file,
    selection,
    visibleLines: first === null ? null : [first, first + VIEW_HEIGHT]
  })
}

/** code_open, code_reveal, code_show_diff: the agent points the user at code. */
export function createCodeTools({ desktops, changes, paths }: CodeToolsDeps): ToolHandlers<'code_open' | 'code_reveal' | 'code_show_diff'> {
  return {
    code_open: ({ path, line }, context) =>
      attempt(() => {
        const file = paths.resolve(context, path)
        showFile(desktops, context.desktopId, file, line === undefined ? null : { startLine: line, endLine: line })
        return textResult(`Code shows ${file}${line === undefined ? '' : ` at line ${line}`}.`)
      }),

    code_reveal: ({ path, startLine, endLine }, context) =>
      attempt(() => {
        const file = paths.resolve(context, path)
        const end = Math.max(startLine, endLine ?? startLine)
        showFile(desktops, context.desktopId, file, { startLine, endLine: end })
        return textResult(`Code shows ${file}, lines ${startLine}-${end} selected.`)
      }),

    code_show_diff: ({ path }, context) =>
      attempt(() => {
        const { desktopId, sessionId } = context
        const file = paths.resolve(context, path)
        const change = changes.list(sessionId).find((c) => c.path.toLowerCase() === file.toLowerCase())
        if (!change) throw new AppError(`There is no recorded change for ${file} in this chat.`)
        const window = desktops.openWindow({ desktopId, app: 'code' }, 'agent')
        const view = pickWindow(desktops.state(desktopId), 'code', window.id).view
        desktops.updateView(window.id, { ...view, selectedChangeId: change.id })
        return textResult(`Code shows the change of ${file}: ${change.kind}, +${change.additions} -${change.deletions}.`)
      })
  }
}
