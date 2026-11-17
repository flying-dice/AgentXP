import type { SessionModeDto } from '@shared/models'
import type { MenuItemDef } from '../../kit/molecules/MenuItem'

/** What a mode means in plain words, for the agents that send no description of their own. */
const KNOWN_DESCRIPTIONS: Record<string, string> = {
  default: 'The agent works as usual.',
  plan: 'The agent plans and changes nothing.'
}

/** The description of a mode: the agent's own, else the one AgentXP knows by the mode's id or name. */
export function modeDescription(mode: Pick<SessionModeDto, 'id' | 'name' | 'description'>): string | null {
  return mode.description?.trim() || KNOWN_DESCRIPTIONS[mode.id.toLowerCase()] || KNOWN_DESCRIPTIONS[mode.name.toLowerCase()] || null
}

export interface ModeMenuOptions {
  modes: readonly SessionModeDto[]
  modeId: string | null
  onmode: (modeId: string) => void
  /** The desktop's "Ask before every action" state; without `onaskfirst` the entry is left out. */
  askFirst?: boolean
  onaskfirst?: (on: boolean) => void
}

/** The Mode menu: each mode with its meaning, then (after a separator) "Ask before every action" with a check mark when on. */
export function modeMenuItems({ modes, modeId, onmode, askFirst = false, onaskfirst }: ModeMenuOptions): MenuItemDef[] {
  const items: MenuItemDef[] = modes.map((m) => {
    const description = modeDescription(m)
    return { id: `mode-${m.id}`, testid: `chat-mode-${m.id}`, label: description ? `${m.name} - ${description}` : m.name, radio: true, checked: m.id === modeId, action: () => onmode(m.id) }
  })
  if (onaskfirst) {
    if (items.length > 0) items.push({ separator: true })
    items.push({ id: 'ask-first', testid: 'chat-mode-ask-first', label: 'Ask before every action', checked: askFirst, action: () => onaskfirst(!askFirst) })
  }
  return items
}

/** The text of the Mode button: the current mode's name. */
export const modeButtonText = (modes: readonly SessionModeDto[], modeId: string | null): string => `Mode: ${modes.find((m) => m.id === modeId)?.name ?? modes[0]?.name ?? 'Default'}`
