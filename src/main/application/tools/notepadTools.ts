import type { AppView } from '@shared/desktop'
import { AppError } from '../errors'
import type { FolderBrowser } from '../ports'
import type { ToolHandlers } from './catalog'
import { toWorkspacePath } from './paths'
import type { DesktopOps } from './ports'
import { attempt, textResult } from './types'
import { pickWindow } from './windows'

export interface NotepadToolsDeps {
  desktops: DesktopOps
  browser: Pick<FolderBrowser, 'readText'>
}

/** notepad_open, notepad_read. */
export function createNotepadTools({ desktops, browser }: NotepadToolsDeps): ToolHandlers<'notepad_open' | 'notepad_read'> {
  return {
    notepad_open: ({ path }, { desktopId }) =>
      attempt(async () => {
        const root = desktops.state(desktopId).folder.path
        const relative = toWorkspacePath(root, path)
        await browser.readText(root, relative) // fails with a readable error when the file is missing
        const open = desktops.state(desktopId).windows.find((w) => w.view.app === 'notepad' && w.view.path === relative)
        if (open) desktops.focusWindow(open.id)
        else desktops.openWindow({ desktopId, app: 'notepad', path: relative }, 'agent')
        return textResult(`Notepad shows ${relative}.`)
      }),

    notepad_read: ({ path }, { desktopId }) =>
      attempt(async () => {
        const state = desktops.state(desktopId)
        const window = pickWindow(state, 'notepad')
        const view: Extract<AppView, { app: 'notepad' }> = window.view
        const relative = path === undefined ? view.path : toWorkspacePath(state.folder.path, path)
        if (!relative) throw new AppError('The Notepad shows no file. Pass a path or call notepad_open first.')
        const text = await browser.readText(state.folder.path, relative)
        const note = view.dirty && relative === view.path ? '(The Notepad has unsaved edits; this is the saved version.)\n' : ''
        return textResult(note + text)
      })
  }
}
