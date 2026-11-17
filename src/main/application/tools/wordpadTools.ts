import type { AppView } from '@shared/desktop'
import { AppError } from '../errors'
import type { VirtualFileSystem } from '../vfs/VirtualFileSystem'
import type { ToolHandlers } from './catalog'
import type { AgentFileWriter, AppRequests, DesktopOps } from './ports'
import type { ToolPaths } from './ToolPaths'
import { attempt, textResult, type ToolContext } from './types'
import { pickWindow } from './windows'

export interface WordpadToolsDeps {
  desktops: DesktopOps
  vfs: Pick<VirtualFileSystem, 'readFile'>
  paths: ToolPaths
  requests: AppRequests
  files: AgentFileWriter
}

type WordpadView = Extract<AppView, { app: 'wordpad' }>

/** wordpad_open, wordpad_read, wordpad_write. */
export function createWordpadTools({ desktops, vfs, paths, requests, files }: WordpadToolsDeps): ToolHandlers<'wordpad_open' | 'wordpad_read' | 'wordpad_write'> {
  /**
   * Puts `file` in a WordPad window and tells the app to (re)load it. WordPad is an output app: an open window is used
   * where it is (never focused or raised); with none, one opens behind the operator's window (`openOutputWindow`).
   */
  const show = async (context: ToolContext, file: string, windowId?: number): Promise<void> => {
    const { desktopId } = context
    const state = desktops.state(desktopId)
    const existing = windowId === undefined && state.windows.every((w) => w.app !== 'wordpad') ? null : pickWindow(state, 'wordpad', windowId)
    const window = existing ?? (await desktops.openOutputWindow(context.sessionId, { desktopId, app: 'wordpad', path: file }))
    const view = pickWindow(desktops.state(desktopId), 'wordpad', window.id).view as WordpadView
    desktops.updateView(window.id, { ...view, path: file, dirty: false })
    // Best effort: an app that does not answer is not an error here (the view change already tells it).
    void requests.request(desktopId, window.id, 'open', { path: file }).catch(() => {})
  }

  return {
    wordpad_open: ({ path, windowId }, context) =>
      attempt(async () => {
        const file = paths.resolve(context, path)
        await vfs.readFile(context.desktopId, file) // fails with a readable error when the file is missing
        await show(context, file, windowId)
        return textResult(`WordPad shows ${file}.`)
      }),

    wordpad_read: ({ windowId }, { desktopId }) =>
      attempt(async () => {
        const state = desktops.state(desktopId)
        if (windowId === undefined && state.windows.every((w) => w.app !== 'wordpad')) throw new AppError('No WordPad window is open. Call wordpad_open with a file first.')
        const window = pickWindow(state, 'wordpad', windowId)
        const result = await requests.request(desktopId, window.id, 'read', {})
        if (typeof result !== 'string') throw new AppError('WordPad did not return its text.')
        return textResult(result)
      }),

    wordpad_write: ({ path, markdown, windowId }, context) =>
      attempt(async () => {
        const file = paths.resolve(context, path)
        await files.write(context.sessionId, file, markdown)
        await show(context, file, windowId)
        return textResult(`Wrote ${file} (${markdown.length} characters); WordPad shows it.`)
      })
  }
}
