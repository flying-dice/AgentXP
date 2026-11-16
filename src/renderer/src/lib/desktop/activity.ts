/** Pure summaries of what the agent is doing, from the chats of a desktop. */
import type { AguiToolCallState } from '@shared/agui-state'
import type { SessionStatus, ToolCallStatus } from '@shared/models'
import { APP_DISPLAY_NAMES, TOOL_GROUP_PROVIDERS, type PolicyDecision, type ToolGroup, type ToolPolicyDto } from '@shared/desktop'

export interface ChatActivityInput {
  sessionId: number
  title: string
  status: SessionStatus
  /** ISO date; newest chats come first in the feed. */
  updatedAt?: string
  toolCalls: Record<string, AguiToolCallState>
}

const RUNNING: readonly ToolCallStatus[] = ['pending', 'in_progress']

/** What `workingText` says while a chat waits for the user's answer to a permission request (the bar shows "Waiting for you"). */
export const WAITING_FOR_YOU = 'Waiting for you'

/** "Read src/auth/redirect.ts" (the running tool) or the chat title of a working chat; null when idle. */
export function workingText(chats: readonly ChatActivityInput[]): string | null {
  const busy = chats.filter((c) => c.status === 'working' || c.status === 'awaiting_permission' || c.status === 'connecting')
  if (busy.length === 0) return null
  for (const chat of [...busy].reverse()) {
    const calls = Object.values(chat.toolCalls)
    for (let i = calls.length - 1; i >= 0; i--) {
      if (RUNNING.includes(calls[i].status)) return calls[i].title
    }
  }
  const first = busy[busy.length - 1]
  if (first.status === 'connecting') return 'Starting the agent...'
  return first.status === 'awaiting_permission' ? WAITING_FOR_YOU : first.title || 'Thinking'
}

export interface FeedItem {
  key: string
  chatTitle: string
  title: string
  status: ToolCallStatus
}

/** The last `limit` tool calls across chats; the most recently updated chat first, latest call first. */
export function recentToolCalls(chats: readonly ChatActivityInput[], limit = 8): FeedItem[] {
  const ordered = [...chats].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
  const items: FeedItem[] = []
  for (const chat of ordered) {
    const entries = Object.entries(chat.toolCalls)
    for (let i = entries.length - 1; i >= 0; i--) {
      items.push({ key: `${chat.sessionId}:${entries[i][0]}`, chatTitle: chat.title, title: entries[i][1].title, status: entries[i][1].status })
    }
  }
  return items.slice(0, limit)
}

const CHIP_LABELS: Record<Exclude<ToolGroup, 'shell'>, string> = {
  'fs.read': 'Read files',
  'fs.write': 'Write files',
  notepad: 'Notepad',
  code: 'Code',
  terminal: 'Run commands',
  browser: 'Browser',
  paint: 'Paint',
  wordpad: 'WordPad',
  notes: 'Notes',
  events: 'Events',
  snip: 'Screen capture',
  recycle: 'Recycle Bin',
  review: 'Code review'
}

/** The three chips the bar always shows, so "Run commands: Off" can be read without guessing. */
const HEADLINE: { group: Exclude<ToolGroup, 'shell'>; label: string }[] = [
  { group: 'fs.read', label: 'Read files' },
  { group: 'terminal', label: 'Run commands' },
  { group: 'browser', label: 'Browser' }
]

/** `on`: the agent just uses it; `asks`: it must ask first; `off`: not available (denied, or no app that gives it is open). */
export type ChipState = 'on' | 'asks' | 'off'

/** The word after the colon of a chip: the Control Center setting, or Off while no app that provides the tool is open. */
export type ChipWord = 'Allow' | 'Ask' | 'Deny' | 'Off'

export interface ToolChip {
  group: Exclude<ToolGroup, 'shell'>
  /** The chip text, always `<Name>: <Allow|Ask|Deny|Off>` (the names are the rows of Control Center > Permissions). */
  label: string
  /** The name before the colon. */
  name: string
  word: ChipWord
  state: ChipState
  /** The tooltip: what the word means and that a click opens Control Center. */
  tooltip: string
}

const DECISION_WORD: Record<PolicyDecision, ChipWord> = { allow: 'Allow', ask: 'Ask', deny: 'Deny' }

/** The app a person opens to get a tool back, for "Run commands is Off because no Terminal is open." */
function providerText(group: Exclude<ToolGroup, 'shell'>): string {
  const apps = TOOL_GROUP_PROVIDERS[group].map((k) => APP_DISPLAY_NAMES[k])
  return apps.length <= 1 ? (apps[0] ?? 'app') : `${apps.slice(0, -1).join(', ')} or ${apps[apps.length - 1]}`
}

/** The tooltip of a chip; every chip has one. */
export function chipTooltip(group: Exclude<ToolGroup, 'shell'>, name: string, word: ChipWord, setting: ChipWord): string {
  if (word === 'Off') return `${name} is Off because no ${providerText(group)} is open. The setting is ${setting}. Click to change it.`
  return `${name}: ${word}. Click to change this in Control Center.`
}

/**
 * Chips for the top bar, one pattern `<Name>: <Allow|Ask|Deny|Off>`. Read files, Run commands and Browser are always there;
 * the other tool groups appear while their app is open (`tools` is what the open apps give the agent). "Off" only means
 * that no app which provides the tool is open (the tooltip says which and what the setting is); a Deny setting reads
 * "Deny". With `askFirst` ("Ask before every action") every chip that is not Deny or Off reads "Ask".
 */
export function toolChips(tools: readonly ToolGroup[], policy: ToolPolicyDto | null = null, askFirst = false): ToolChip[] {
  const open = new Set(tools)
  const chip = (group: Exclude<ToolGroup, 'shell'>, name: string): ToolChip => {
    const decision = policy?.groups[group] ?? 'allow'
    const setting = DECISION_WORD[decision]
    const word: ChipWord = decision === 'deny' ? 'Deny' : !open.has(group) ? 'Off' : askFirst || decision === 'ask' ? 'Ask' : 'Allow'
    const state: ChipState = word === 'Deny' || word === 'Off' ? 'off' : word === 'Ask' ? 'asks' : 'on'
    return { group, name, word, state, label: `${name}: ${word}`, tooltip: chipTooltip(group, name, word, setting) }
  }
  const headline = new Set<ToolGroup>(HEADLINE.map((h) => h.group))
  const others = tools.filter((g): g is Exclude<ToolGroup, 'shell'> => g !== 'shell' && !headline.has(g))
  return [...HEADLINE.map((h) => chip(h.group, h.label)), ...others.map((g) => chip(g, CHIP_LABELS[g]))]
}

/** True when no app gives the agent a tool (the bar then adds "open an app"). */
export const noToolsOpen = (tools: readonly ToolGroup[]): boolean => tools.every((g) => g === 'shell')

/** What the status area of the top bar shows; `data-state` of the bar and its dot. */
export type BarState = 'idle' | 'working' | 'paused' | 'control' | 'waiting'

export interface BarStatusInput {
  paused: boolean
  /** "Ask before every action" or the Browser's Take over. */
  userInControl: boolean
  /** `workingText` of the desktop's chats; null = idle. */
  working: string | null
  /** A short line that replaces "Idle" for a few seconds ("Resumed. Nothing was stopped."). */
  notice?: string | null
}

export const PAUSED_TEXT = 'Paused: no agent will act until you resume.'
export const CONTROL_TEXT = 'You are in control: the agent asks before every action.'
/** The first line of the Activity gadget while the user is in control. */
export const CONTROL_NOTE = 'Stopped: you took control'
export const RESUME_BUTTON = 'Resume agents and continue'

/**
 * The one status line of the top bar: always one of Paused, You are in control, Waiting for you, Working: <what> or
 * Idle (or the short notice that stands in for Idle). Paused wins over control, control over the rest, so what the
 * agent may do is never hidden by what it is doing.
 */
export function barStatus({ paused, userInControl, working, notice = null }: BarStatusInput): { state: BarState; text: string } {
  if (paused) return { state: 'paused', text: PAUSED_TEXT }
  if (userInControl) return { state: 'control', text: CONTROL_TEXT }
  if (working === WAITING_FOR_YOU) return { state: 'waiting', text: WAITING_FOR_YOU }
  if (working) return { state: 'working', text: `Working: ${working}` }
  return { state: 'idle', text: notice ?? 'Idle' }
}
