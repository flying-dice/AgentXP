/**
 * The Explorer's context menus as data: what a file or folder offers, and what the empty background offers.
 * Pure, so the items and their order are tested; ExplorerApp passes the actions.
 */
import type { VPath } from '@shared/vfs'
import type { MenuItemDef } from '../../kit/molecules/MenuItem'
import { opensInNotepad } from '../paths'

export interface EntryTarget {
  path: VPath
  kind: 'file' | 'directory'
}

export interface EntryActions {
  open: () => void
  openWith: (app: 'code' | 'notepad') => void
  copyPath: () => void
  properties: () => void
  startChat: () => void
  askChat: () => void
}

/**
 * Open, Open with Notepad / Code (files), Copy as path, Start a chat here, Ask the agent about this, Properties.
 * Explorer only views files, so there are no editing verbs (Cut, Copy, Paste, Delete, Rename).
 */
export function entryItems(target: EntryTarget, a: EntryActions): MenuItemDef[] {
  const file = target.kind === 'file'
  return [
    // A folder keeps the ids `explorer-folder-open` and `explorer-folder-chat` (test ids `menu-item-<id>`) that specs use.
    file
      ? { id: 'explorer-ctx-open', testid: 'explorer-ctx-open', label: '&Open', icon: 'file-text', action: a.open }
      : { id: 'explorer-folder-open', label: '&Open', icon: 'open-folder', action: a.open },
    ...(file
      ? [
          { id: 'explorer-ctx-open-notepad', testid: 'explorer-ctx-open-notepad', label: 'Open with &Notepad', icon: 'file-text', action: () => a.openWith('notepad') } as MenuItemDef,
          { id: 'explorer-ctx-open-code', testid: 'explorer-ctx-open-code', label: 'Open with &Code', icon: 'file-code', action: () => a.openWith('code') } as MenuItemDef
        ]
      : []),
    { separator: true },
    { id: 'explorer-ctx-copy-path', testid: 'explorer-ctx-copy-path', label: 'Copy as &path', icon: 'copy', action: a.copyPath },
    { separator: true },
    file
      ? { id: 'explorer-ctx-start-chat', testid: 'explorer-ctx-start-chat', label: 'Start a &chat here', icon: 'session', action: a.startChat }
      : { id: 'explorer-folder-chat', label: 'Start a &chat here', icon: 'session', action: a.startChat },
    { id: 'explorer-ctx-ask', testid: 'explorer-ctx-ask', label: 'Ask the agent a&bout this...', icon: 'session', action: a.askChat },
    { separator: true },
    { id: 'explorer-ctx-properties', testid: 'explorer-ctx-properties', label: 'P&roperties', icon: 'properties', action: a.properties }
  ]
}

export interface BackgroundActions {
  refresh: () => void
  up: () => void
  /** There is a folder to chat in (not on Computer). */
  inFolder: boolean
  startChat: () => void
  askChat: () => void
}

/** Refresh, Up one level, Start chat here, Ask the agent about this folder. */
export function backgroundItems(a: BackgroundActions): MenuItemDef[] {
  return [
    { id: 'explorer-ctx-refresh', testid: 'explorer-ctx-refresh', label: '&Refresh', icon: 'refresh', shortcut: 'F5', action: a.refresh },
    { id: 'explorer-ctx-up', testid: 'explorer-ctx-up', label: '&Up one level', icon: 'chevron-up', disabled: !a.inFolder, action: a.up },
    { separator: true },
    { id: 'explorer-ctx-start-chat', testid: 'explorer-ctx-start-chat', label: 'Start a &chat here', icon: 'session', disabled: !a.inFolder, action: a.startChat },
    { id: 'explorer-ctx-ask', testid: 'explorer-ctx-ask', label: 'Ask the agent a&bout this...', icon: 'session', disabled: !a.inFolder, action: a.askChat }
  ]
}

/** The text of the Properties box of a file or folder. */
export function propertiesText(entry: { name: string; path: VPath; kind: 'file' | 'directory'; size: number | null; modifiedAt: string | null }, type: string): string {
  const lines = [entry.name, '', `Type: ${type}`, `Location: ${entry.path}`]
  if (entry.kind === 'file' && entry.size !== null) lines.push(`Size: ${entry.size.toLocaleString('en-US')} bytes`)
  if (entry.modifiedAt) lines.push(`Modified: ${new Date(entry.modifiedAt).toLocaleString()}`)
  return lines.join('\n')
}

/** The app Open picks for a file: Notepad for text, Code for the rest. */
export const defaultOpener = (path: VPath): 'code' | 'notepad' => (opensInNotepad(path) ? 'notepad' : 'code')

export interface DriveActions {
  open: () => void
  startChat: () => void
  askChat: () => void
  copyPath: () => void
  eject: () => void
  properties: () => void
}

/** What a drive offers (Computer and the navigation pane): Open, Start a chat here, Ask the agent about this, Copy path, Eject, Properties. */
export function driveItems(drive: { kind: 'system' | 'removable' }, a: DriveActions): MenuItemDef[] {
  return [
    { id: 'explorer-drive-open', label: '&Open', icon: 'open-folder', action: a.open },
    { id: 'explorer-drive-chat', label: 'Start a &chat here', icon: 'session', action: a.startChat },
    { id: 'explorer-ctx-drive-ask', testid: 'explorer-ctx-drive-ask', label: 'Ask the agent a&bout this...', icon: 'session', action: a.askChat },
    { id: 'explorer-ctx-drive-copy-path', testid: 'explorer-ctx-drive-copy-path', label: 'Copy as &path', icon: 'copy', action: a.copyPath },
    { separator: true },
    { id: 'explorer-drive-eject', label: '&Eject (remove from this desktop)', icon: 'usb', disabled: drive.kind !== 'removable', action: a.eject },
    { id: 'explorer-ctx-drive-properties', testid: 'explorer-ctx-drive-properties', label: 'P&roperties', icon: 'properties', action: a.properties }
  ]
}

/** The text of the Properties box of a drive. */
export function driveProperties(drive: { label: string; letter: string; kind: 'system' | 'removable'; pluggedAt: string | null }): string {
  const lines = [`${drive.label} (${drive.letter}:)`, '', `Type: ${drive.kind === 'removable' ? 'Project' : 'Local Disk'}`, `Drive letter: ${drive.letter}:`]
  if (drive.pluggedAt) lines.push(`Plugged in: ${new Date(drive.pluggedAt).toLocaleString()}`)
  if (drive.kind === 'removable') lines.push('', 'Eject removes the drive from this desktop. The folder and its files stay on your disk.')
  return lines.join('\n')
}

/** Status bar text of Computer: how many projects are plugged in. */
export const projectCountText = (projects: number): string => (projects === 0 ? 'No projects plugged in' : `${projects} project${projects === 1 ? '' : 's'} plugged in`)
