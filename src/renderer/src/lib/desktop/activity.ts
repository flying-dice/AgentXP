/** Pure summaries of what the agent is doing, from the chats of a desktop. */
import type { AguiToolCallState } from '@shared/agui-state'
import type { SessionStatus, ToolCallStatus } from '@shared/models'
import { PERMISSION_NAMES } from '@shared/permissionNames'
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

/** What the bar says while requests wait for the user's answer. */
export const WAITING_FOR_YOU = 'Waiting for you'

/** "Waiting for you: 1 request to approve" or "Waiting for you: 2 requests to approve"; one count for the bar, the chips row and the taskbar flag. */
export const waitingText = (count: number): string => `${WAITING_FOR_YOU}: ${count} ${count === 1 ? 'request' : 'requests'} to approve`

/**
 * What the status area says about the work: a waiting request first ("Waiting for you: 2 requests to approve", `waiting` defaults to the
 * chats that wait), then the running tool, then the title of a working chat; null when idle.
 * With `focusedId` (the chat the user works in) the text follows that chat only: ready is idle, working is its running tool, and
 * "Starting the agent..." shows only while that chat's own state is `connecting` (UX-145), never for a chat that is ready. Without a
 * focused chat, every working chat counts and a chat that is still starting is not mentioned.
 */
export function workingText(chats: readonly ChatActivityInput[], waiting?: number, focusedId?: number | null): string | null {
  const focused = focusedId == null ? undefined : chats.find((c) => c.sessionId === focusedId)
  const busy = focused
    ? [focused].filter((c) => c.status === 'working' || c.status === 'awaiting_permission' || c.status === 'connecting')
    : chats.filter((c) => c.status === 'working' || c.status === 'awaiting_permission')
  const waits = waiting ?? chats.filter((c) => c.status === 'awaiting_permission').length
  if (waits > 0) return waitingText(waits)
  if (busy.length === 0) return null
  for (const chat of [...busy].reverse()) {
    const calls = Object.values(chat.toolCalls)
    for (let i = calls.length - 1; i >= 0; i--) {
      if (RUNNING.includes(calls[i].status)) return calls[i].title
    }
  }
  const first = busy[busy.length - 1]
  return first.status === 'connecting' ? 'Starting the agent...' : first.title || 'Thinking'
}

export interface FeedItem {
  key: string
  chatTitle: string
  title: string
  status: ToolCallStatus
  /** How many equal calls in a row this line stands for ("Read the page (24 times)"); 1 for a single call. */
  count: number
}

/** "Read the page (24 times)" for a repeated call, the title alone for a single one. */
export const feedText = (title: string, count: number): string => (count > 1 ? `${title} (${count} times)` : title)

/** The last `limit` lines of what the agent did across chats; the most recently updated chat first, latest call first, equal calls in a row as one line. */
export function recentToolCalls(chats: readonly ChatActivityInput[], limit = 8): FeedItem[] {
  const ordered = [...chats].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
  const items: FeedItem[] = []
  for (const chat of ordered) {
    const entries = Object.entries(chat.toolCalls)
    for (let i = entries.length - 1; i >= 0; i--) {
      const last = items[items.length - 1]
      if (last && last.chatTitle === chat.title && last.title === entries[i][1].title) last.count++
      else items.push({ key: `${chat.sessionId}:${entries[i][0]}`, chatTitle: chat.title, title: entries[i][1].title, status: entries[i][1].status, count: 1 })
    }
  }
  return items.slice(0, limit)
}

/** The three chips the bar always shows, so "Run commands: Ask" can be read without guessing. */
const HEADLINE: Exclude<ToolGroup, 'shell'>[] = ['fs.read', 'terminal', 'browser']

/** `on`: the agent just uses it; `asks`: it must ask first; `off`: not available (denied, or no app that gives it is open). */
export type ChipState = 'on' | 'asks' | 'off'

/** The word after the colon of a chip: the setting of Control Center, or Ask while "Ask before every action" is on. Off is never shown: a denied tool reads Deny. */
export type ChipWord = 'Allow' | 'Ask' | 'Deny'

export interface ToolChip {
  group: Exclude<ToolGroup, 'shell'>
  /** The chip text: `<Name>: <Allow|Ask|Deny>`, plus ` (no Terminal open)` while no app that provides the tool is open. */
  label: string
  /** The name before the colon. */
  name: string
  word: ChipWord
  state: ChipState
  /** No app that provides the tool is open, so the agent cannot use it yet (never true for Deny: it reads Deny). */
  closed: boolean
  /** The tooltip: "Open Control Center to change this.", then the setting and why the chip is as it is. */
  tooltip: string
}

/** The first words of every chip tooltip; a chip is a button that opens Control Center at Permissions (UX-142). */
export const OPEN_CONTROL_CENTRE = 'Open Control Center to change this.'

/** The name a screen reader reads for a chip: "Run commands: Ask. Open Control Center to change." */
export const chipAriaLabel = (chip: Pick<ToolChip, 'label'>): string => `${chip.label}. Open Control Center to change.`

const DECISION_WORD: Record<PolicyDecision, ChipWord> = { allow: 'Allow', ask: 'Ask', deny: 'Deny' }

/** The apps a person opens to get a tool back, long form: "Explorer, Code or Code Review". */
function providerText(group: Exclude<ToolGroup, 'shell'>): string {
  const apps = TOOL_GROUP_PROVIDERS[group].map((k) => APP_DISPLAY_NAMES[k])
  return apps.length <= 1 ? (apps[0] ?? 'app') : `${apps.slice(0, -1).join(', ')} or ${apps[apps.length - 1]}`
}

/** The short form for the chip: "Terminal" for one app, "app" for several ("no app open"). */
const providerShort = (group: Exclude<ToolGroup, 'shell'>): string => (TOOL_GROUP_PROVIDERS[group].length === 1 ? APP_DISPLAY_NAMES[TOOL_GROUP_PROVIDERS[group][0]] : 'app')

/**
 * The tooltip of a chip; every chip has one. It names the setting and, when the chip differs from it, the reason:
 * "Run commands is set to Ask. The agent cannot use it yet because no Terminal is open. Click to change it."
 */
export function chipTooltip(group: Exclude<ToolGroup, 'shell'>, name: string, word: ChipWord, setting: ChipWord, closed: boolean): string {
  const parts = [`${name} is set to ${setting}.`]
  if (word !== setting) parts.push('You are in control, so the agent asks first.')
  if (word === 'Deny') parts.push('The agent cannot use it.')
  else if (closed) parts.push(`The agent cannot use it yet because no ${providerText(group)} is open.`)
  return `${OPEN_CONTROL_CENTRE} ${parts.join(' ')}`
}

/**
 * Chips for the top bar, one pattern `<Name>: <Allow|Ask|Deny>`. Read files, Run commands and Browser are always there;
 * the other tool groups appear while their app is open (`tools` is what the open apps give the agent). The word is the setting
 * (or Ask while `askFirst`, "Ask before every action"); "Off" is not a word of the bar. While no app that provides the tool is
 * open the chip adds "(no Terminal open)" and a distinct style, so the setting and the reason can be read together.
 */
export function toolChips(tools: readonly ToolGroup[], policy: ToolPolicyDto | null = null, askFirst = false): ToolChip[] {
  const open = new Set(tools)
  const chip = (group: Exclude<ToolGroup, 'shell'>, name: string): ToolChip => {
    const decision = policy?.groups[group] ?? 'allow'
    const setting = DECISION_WORD[decision]
    const word: ChipWord = decision === 'deny' ? 'Deny' : askFirst || decision === 'ask' ? 'Ask' : 'Allow'
    const closed = word !== 'Deny' && !open.has(group)
    const state: ChipState = word === 'Deny' || closed ? 'off' : word === 'Ask' ? 'asks' : 'on'
    const label = closed ? `${name}: ${word} (no ${providerShort(group)} open)` : `${name}: ${word}`
    return { group, name, word, state, closed, label, tooltip: chipTooltip(group, name, word, setting, closed) }
  }
  const headline = new Set<ToolGroup>(HEADLINE)
  const others = tools.filter((g): g is Exclude<ToolGroup, 'shell'> => g !== 'shell' && !headline.has(g))
  return [...HEADLINE, ...others].map((g) => chip(g, PERMISSION_NAMES[g]))
}

/** The apps that are not open for the chips that need one and are not denied: "Terminal and Browser" (the take-over text). */
export function closedAppNames(chips: readonly ToolChip[]): string[] {
  const names = chips.filter((c) => c.closed).flatMap((c) => TOOL_GROUP_PROVIDERS[c.group].length === 1 ? [APP_DISPLAY_NAMES[TOOL_GROUP_PROVIDERS[c.group][0]]] : [])
  return [...new Set(names)]
}

/** True when no app and no chat is open; an open chat is something the agent can use. */
export const noToolsOpen = (tools: readonly ToolGroup[], chatsOpen = 0): boolean => chatsOpen === 0 && tools.every((g) => g === 'shell')

/** The line next to the chips: "nothing yet" when no app and no chat is open, "this chat" when only chats are, otherwise none. */
export function toolsLine(tools: readonly ToolGroup[], chatsOpen: number): string | null {
  if (noToolsOpen(tools, chatsOpen)) return 'Agent can use nothing yet. Open an app to give it a tool.'
  return tools.every((g) => g === 'shell') ? 'The agent can use this chat.' : null
}

/** What the status area of the top bar shows; `data-state` of the bar and its dot. */
export type BarState = 'idle' | 'working' | 'paused' | 'control' | 'waiting'

export interface BarStatusInput {
  /** The words of the "waiting" link when they name the chat ("Fix login is waiting: run a command"); else the count text is used. */
  waitingFor?: string | null
  paused: boolean
  /** "Ask before every action" or the Browser's Take over. */
  userInControl: boolean
  /** `workingText` of the desktop's chats; null = idle. */
  working: string | null
  /** Requests that wait for the user's answer (the same count as the taskbar flag). */
  waiting?: number
  /** A short line that replaces "Idle" for a few seconds ("Resumed. Nothing was stopped."). */
  notice?: string | null
  /** Apps whose tool is not open (`closedAppNames` of the chips); named in the take-over line. */
  closedApps?: readonly string[]
}

/** What taking control does to every tool, in one sentence (the bar, the Activity tile and the Take over tooltip use it). */
const ASK_FIRST_SENTENCE = 'All tools ask first until you resume.'
const CONTROL_SENTENCE = `You are in control. ${ASK_FIRST_SENTENCE}`
export const PAUSED_TEXT = 'Paused: no agent will act until you resume.'
/**
 * The take-over line. It agrees with the chips: every tool asks first, and when some tools need an app that is not open
 * it says which ("Tools that need an app ask first. Terminal and Browser are not open.").
 */
export function controlText(closedApps: readonly string[] = []): string {
  const closed = closedApps.length === 0 ? '' : ` ${closedApps.length === 1 ? closedApps[0] : `${closedApps.slice(0, -1).join(', ')} and ${closedApps[closedApps.length - 1]}`} ${closedApps.length === 1 ? 'is' : 'are'} not open.`
  return `${CONTROL_SENTENCE}${closed}`
}
/** The first line of the Activity gadget while the user is in control and a step was running. */
export const CONTROL_NOTE = `Stopped: you took control. ${ASK_FIRST_SENTENCE}`
/** The same line while nothing was running: it is true and it does not sit over "Nothing has happened yet". */
export const CONTROL_IDLE_NOTE = CONTROL_SENTENCE
/** The tooltip of the Browser's Take over button: what one click does to every tool (UX-143). */
export const TAKE_OVER_TIP = CONTROL_SENTENCE
/** The button in the bar that ends the take-over, and what it does. */
export const RESUME_CONTROL_BUTTON = 'Resume'
export const RESUME_CONTROL_TIP = 'The agent goes back to the settings in Control Center and no longer asks before every action.'

/** The first line of the Activity gadget: null when the user is not in control; "Stopped" only when a step was running (`stoppedStep`: a chat was busy when control was taken) or was stopped. */
export function controlNote(userInControl: boolean, feed: readonly FeedItem[], stoppedStep = false): string | null {
  if (!userInControl) return null
  return stoppedStep || feed.some((f) => f.status === 'pending' || f.status === 'in_progress' || f.status === 'cancelled') ? CONTROL_NOTE : CONTROL_IDLE_NOTE
}
export const RESUME_BUTTON = 'Resume agents and continue'

/**
 * The one status line of the top bar: always one of Paused, You are in control, Waiting for you, Working: <what> or
 * Idle (or the short notice that stands in for Idle). Paused wins over control, control over the rest, so what the
 * agent may do is never hidden by what it is doing.
 */
export function barStatus({ paused, userInControl, working, waiting = 0, waitingFor = null, notice = null, closedApps = [] }: BarStatusInput): { state: BarState; text: string } {
  if (paused) return { state: 'paused', text: PAUSED_TEXT }
  if (userInControl) return { state: 'control', text: controlText(closedApps) }
  if (waiting > 0) return { state: 'waiting', text: waitingFor ?? waitingText(waiting) }
  if (working) return { state: 'working', text: `Working: ${working}` }
  return { state: 'idle', text: notice ?? 'Idle' }
}
