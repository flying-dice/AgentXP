import { resolve } from 'node:path'
import type { AppView } from '@shared/desktop'
import type { FileChangeDto, Id } from '@shared/models'
import { AppError } from '../errors'
import type { ToolHandlers } from './catalog'
import { toWorkspacePath } from './paths'
import type { DesktopOps } from './ports'
import { attempt, textResult } from './types'
import { pickWindow } from './windows'

export interface CodeToolsDeps {
  desktops: DesktopOps
  changes: { list(sessionId: Id): FileChangeDto[] }
}

type CodeView = Extract<AppView, { app: 'code' }>

const VIEW_CONTEXT_LINES = 5
const VIEW_HEIGHT = 30

/** Shows `path` in the Code app (opening it when needed) with the optional selection. */
function showFile(desktops: DesktopOps, desktopId: Id, relative: string, selection: CodeView['selection']): void {
  const window = desktops.openWindow({ desktopId, app: 'code', path: relative }, 'agent')
  const view = pickWindow(desktops.state(desktopId), 'code', window.id).view
  const tabs = view.tabs.includes(relative) ? view.tabs : [...view.tabs, relative]
  const first = selection ? Math.max(1, selection.startLine - VIEW_CONTEXT_LINES) : null
  desktops.updateView(window.id, {
    ...view,
    tabs,
    activePath: relative,
    selection,
    visibleLines: first === null ? null : [first, first + VIEW_HEIGHT]
  })
}

/** code_open, code_reveal, code_show_diff: the agent points the user at code. */
export function createCodeTools({ desktops, changes }: CodeToolsDeps): ToolHandlers<'code_open' | 'code_reveal' | 'code_show_diff'> {
  const workspacePath = (desktopId: Id, path: string): string => toWorkspacePath(desktops.state(desktopId).folder.path, path)

  return {
    code_open: ({ path, line }, { desktopId }) =>
      attempt(() => {
        const relative = workspacePath(desktopId, path)
        showFile(desktops, desktopId, relative, line === undefined ? null : { startLine: line, endLine: line })
        return textResult(`Code shows ${relative}${line === undefined ? '' : ` at line ${line}`}.`)
      }),

    code_reveal: ({ path, startLine, endLine }, { desktopId }) =>
      attempt(() => {
        const relative = workspacePath(desktopId, path)
        const end = Math.max(startLine, endLine ?? startLine)
        showFile(desktops, desktopId, relative, { startLine, endLine: end })
        return textResult(`Code shows ${relative}, lines ${startLine}-${end} selected.`)
      }),

    code_show_diff: ({ path }, { desktopId, sessionId }) =>
      attempt(() => {
        const state = desktops.state(desktopId)
        const root = state.folder.path
        const relative = workspacePath(desktopId, path)
        const change = changes.list(sessionId).find((c) => resolve(root, c.path) === resolve(root, relative))
        if (!change) throw new AppError(`There is no recorded change for ${relative} in this chat.`)
        const window = desktops.openWindow({ desktopId, app: 'code' }, 'agent')
        const view = pickWindow(desktops.state(desktopId), 'code', window.id).view
        desktops.updateView(window.id, { ...view, selectedChangeId: change.id })
        return textResult(`Code shows the change of ${relative}: ${change.kind}, +${change.additions} -${change.deletions}.`)
      })
  }
}
