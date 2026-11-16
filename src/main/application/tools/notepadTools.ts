import type { AppView } from '@shared/desktop'
import { AppError } from '../errors'
import type { VirtualFileSystem } from '../vfs/VirtualFileSystem'
import type { ToolHandlers } from './catalog'
import type { DesktopOps } from './ports'
import type { ToolPaths } from './ToolPaths'
import { attempt, textResult } from './types'
import { pickWindow } from './windows'

export interface NotepadToolsDeps {
  desktops: DesktopOps
  vfs: Pick<VirtualFileSystem, 'readFile'>
  paths: ToolPaths
}

/** notepad_open, notepad_read. */
export function createNotepadTools({ desktops, vfs, paths }: NotepadToolsDeps): ToolHandlers<'notepad_open' | 'notepad_read'> {
  return {
    notepad_open: ({ path }, context) =>
      attempt(async () => {
        const { desktopId } = context
        const file = paths.resolve(context, path)
        await vfs.readFile(desktopId, file) // fails with a readable error when the file is missing
        const open = desktops.state(desktopId).windows.find((w) => w.view.app === 'notepad' && w.view.path === file)
        if (open) desktops.focusWindow(open.id, 'agent')
        else desktops.openWindow({ desktopId, app: 'notepad', path: file }, 'agent')
        return textResult(`Notepad shows ${file}.`)
      }),

    notepad_read: ({ path }, context) =>
      attempt(async () => {
        const { desktopId } = context
        const window = pickWindow(desktops.state(desktopId), 'notepad')
        const view: Extract<AppView, { app: 'notepad' }> = window.view
        const file = path === undefined ? view.path : paths.resolve(context, path)
        if (!file) throw new AppError('The Notepad shows no file. Pass a path or call notepad_open first.')
        const text = await vfs.readFile(desktopId, file)
        const note = view.dirty && file === view.path ? '(The Notepad has unsaved edits; this is the saved version.)\n' : ''
        return textResult(note + text)
      })
  }
}
