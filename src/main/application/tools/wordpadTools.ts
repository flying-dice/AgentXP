import type { AppView } from '@shared/desktop'
import type { Id } from '@shared/models'
import { AppError } from '../errors'
import type { FolderBrowser } from '../ports'
import type { ToolHandlers } from './catalog'
import { toWorkspacePath } from './paths'
import type { AgentFileWriter, AppRequests, DesktopOps } from './ports'
import { attempt, textResult } from './types'
import { pickWindow } from './windows'

export interface WordpadToolsDeps {
  desktops: DesktopOps
  browser: Pick<FolderBrowser, 'readText'>
  requests: AppRequests
  files: AgentFileWriter
}

type WordpadView = Extract<AppView, { app: 'wordpad' }>

/** wordpad_open, wordpad_read, wordpad_write. */
export function createWordpadTools({ desktops, browser, requests, files }: WordpadToolsDeps): ToolHandlers<'wordpad_open' | 'wordpad_read' | 'wordpad_write'> {
  /** Shows `relative` in a WordPad window (opening one when needed) and tells the app to (re)load it. */
  const show = (desktopId: Id, relative: string, windowId?: number): void => {
    const state = desktops.state(desktopId)
    const existing = windowId === undefined && state.windows.every((w) => w.app !== 'wordpad') ? null : pickWindow(state, 'wordpad', windowId)
    const window = existing ?? desktops.openWindow({ desktopId, app: 'wordpad', path: relative }, 'agent')
    desktops.focusWindow(window.id)
    const view = pickWindow(desktops.state(desktopId), 'wordpad', window.id).view as WordpadView
    desktops.updateView(window.id, { ...view, path: relative, dirty: false })
    // Best effort: an app that does not answer is not an error here (the view change already tells it).
    void requests.request(desktopId, window.id, 'open', { path: relative }).catch(() => {})
  }

  return {
    wordpad_open: ({ path, windowId }, { desktopId }) =>
      attempt(async () => {
        const root = desktops.state(desktopId).folder.path
        const relative = toWorkspacePath(root, path)
        await browser.readText(root, relative) // fails with a readable error when the file is missing
        show(desktopId, relative, windowId)
        return textResult(`WordPad shows ${relative}.`)
      }),

    wordpad_read: ({ windowId }, { desktopId }) =>
      attempt(async () => {
        const window = pickWindow(desktops.state(desktopId), 'wordpad', windowId)
        const result = await requests.request(desktopId, window.id, 'read', {})
        if (typeof result !== 'string') throw new AppError('WordPad did not return its text.')
        return textResult(result)
      }),

    wordpad_write: ({ path, markdown, windowId }, { desktopId, sessionId }) =>
      attempt(async () => {
        const root = desktops.state(desktopId).folder.path
        const relative = toWorkspacePath(root, path)
        await files.write(sessionId, root, relative, markdown)
        show(desktopId, relative, windowId)
        return textResult(`Wrote ${relative} (${markdown.length} characters); WordPad shows it.`)
      })
  }
}
