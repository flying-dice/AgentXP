import type { MenuDef, MenuItemDef } from '../kit/molecules/MenuItem'
import type { SessionModeDto, SessionModelDto } from '@shared/models'
import { shortcutLabel, type CommandId } from './shortcuts'

/** What the menus need to know about the application to enable, disable and fill their items. */
export interface MenuState {
  hasSession: boolean
  /** A turn is running (or waiting for a permission answer). */
  busy: boolean
  /** There is a change to revert and no turn is running. */
  canUndo: boolean
  canCompact: boolean
  modes: SessionModeDto[]
  currentModeId: string | null
  models: SessionModelDto[]
  currentModelId: string | null
}

export interface MenuActions {
  run(command: CommandId): void
  setMode(id: string): void
  setModel(id: string): void
}

const SEPARATOR: MenuItemDef = { separator: true }

export function buildMenus(state: MenuState, actions: MenuActions): MenuDef[] {
  const cmd = (command: CommandId, label: string, extra: Partial<MenuItemDef> = {}): MenuItemDef => ({
    id: command,
    label,
    shortcut: shortcutLabel(command) || undefined,
    action: () => actions.run(command),
    ...extra
  })
  const choices = (
    list: { id: string; name: string }[],
    current: string | null,
    pick: (id: string) => void
  ): MenuItemDef[] => list.map((m) => ({ id: m.id, label: m.name.replaceAll('&', '&&'), radio: true, checked: m.id === current, action: () => pick(m.id) }))

  return [
    {
      label: '&File',
      items: [
        cmd('session.new', '&New Session'),
        cmd('folder.open', '&Open Folder…'),
        SEPARATOR,
        cmd('transcript.save', '&Save Transcript…', { disabled: !state.hasSession }),
        SEPARATOR,
        cmd('app.exit', 'E&xit')
      ]
    },
    {
      label: '&Edit',
      items: [
        cmd('edit.undo', '&Undo Last Edit', { disabled: !state.canUndo }),
        SEPARATOR,
        cmd('edit.copyLast', '&Copy Last Response', { disabled: !state.hasSession }),
        cmd('edit.clearTranscript', 'C&lear Transcript', { disabled: !state.hasSession || state.busy })
      ]
    },
    {
      label: '&View',
      items: [
        cmd('view.sessions', '&Sessions'),
        cmd('view.files', '&Files'),
        SEPARATOR,
        cmd('view.changes', '&Changes'),
        cmd('view.tasks', '&Tasks'),
        cmd('view.properties', '&Properties')
      ]
    },
    {
      label: '&Session',
      items: [
        cmd('session.new', '&New Session'),
        cmd('session.stop', '&Stop', { disabled: !state.busy }),
        SEPARATOR,
        cmd('session.compact', '&Compact Conversation', { disabled: !state.canCompact || state.busy, shortcut: undefined }),
        SEPARATOR,
        { id: 'mode', label: '&Mode', disabled: state.modes.length === 0, items: choices(state.modes, state.currentModeId, actions.setMode) },
        { id: 'model', label: 'M&odel', disabled: state.models.length === 0, items: choices(state.models, state.currentModelId, actions.setModel) }
      ]
    },
    { label: '&Tools', items: [cmd('tools.options', '&Options…')] },
    {
      label: '&Help',
      items: [cmd('help.help', 'Agent7 &Help'), cmd('help.shortcuts', '&Keyboard Shortcuts'), SEPARATOR, cmd('help.about', '&About Agent7')]
    }
  ]
}
