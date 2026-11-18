/** Pure summaries of what the agent is doing, from the chats of a desktop. */
import type { AguiToolCallState } from '@shared/agui-state'
import type { SessionStatus, ToolCallStatus } from '@shared/models'
import { liveToolTitle, toolTitleOr } from '../app/session/toolTitles'
import { currentStep, stepWords } from '../app/session/stepWords'
import type { AgentIdentity } from '@shared/identity'
import { SHOW_LABELS, toolShowTargets, type ToolShowTarget } from '@shared/toolShowTarget'
import { PERMISSION_NAMES } from '@shared/permissionNames'
import { TOOL_GROUPS, type PolicyDecision, type ToolGroup, type ToolPolicyDto } from '@shared/desktop'

export interface ChatActivityInput {
  sessionId: number
  title: string
  status: SessionStatus
  /** ISO date; newest chats come first in the feed. */
  updatedAt?: string
  /** The chat's working directory (relative paths of its steps are relative to it). */
  cwd?: string | null
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
      if (RUNNING.includes(calls[i].status)) return liveToolTitle(calls[i].title, calls[i].rawInput) ?? calls[i].title
    }
  }
  const first = busy[busy.length - 1]
  return first.status === 'connecting' ? 'Starting the agent...' : first.title || 'Thinking'
}

/** The chat the "Working: ..." link opens: the focused chat when it works, else the newest chat that works; null when none does. */
export function workingChatId(chats: readonly ChatActivityInput[], focusedId: number | null = null): number | null {
  const busy = (c: ChatActivityInput): boolean => c.status === 'working' || c.status === 'awaiting_permission'
  const focused = focusedId === null ? undefined : chats.find((c) => c.sessionId === focusedId && busy(c))
  if (focused) return focused.sessionId
  return [...chats].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')).find(busy)?.sessionId ?? null
}

/** The top-bar line while several chats work: "3 agents working". */
export const agentsWorkingText = (count: number): string => `${count} agents working`

/** One row of the top-bar agents popup (`docs/AGENT_PRESENCE.md`, section 4). */
export interface WorkingAgent {
  sessionId: number
  /** The chat's title (the tooltip of **Open chat**). */
  title: string
  identity: AgentIdentity
  /** The step in plain words ("reading auth.ts"), "waiting for you" or "thinking". */
  step: string
}

/** The chats that work now, newest first, each with its agent and its step: the rows of the agents popup. */
export function workingAgents(chats: readonly ChatActivityInput[], identityOf: (sessionId: number) => AgentIdentity): WorkingAgent[] {
  return [...chats]
    .filter((c) => c.status === 'working' || c.status === 'awaiting_permission')
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    .map((c) => ({ sessionId: c.sessionId, title: c.title, identity: identityOf(c.sessionId), step: c.status === 'awaiting_permission' ? 'waiting for you' : (currentStep(c.toolCalls) ?? 'thinking') }))
}

export interface FeedItem {
  /** `<sessionId>:<toolCallId>` of the latest call the line stands for. */
  key: string
  sessionId: number
  toolCallId: string
  /** The latest call the line stands for (its **Show in...** target is derived from it). */
  call: AguiToolCallState
  /** The chat's working directory. */
  cwd: string | null
  chatTitle: string
  title: string
  status: ToolCallStatus
  /** How many equal calls in a row this line stands for ("Read the page (24 times)"); 1 for a single call. */
  count: number
}

/** The place a feed line shows when clicked (Code, Terminal, Browser), or null: the line then opens its chat. */
export const feedTarget = (item: FeedItem): ToolShowTarget | null => toolShowTargets({ ...item.call, result: null, cwd: item.cwd })[0] ?? null

/** What a click on a feed line does, for its tooltip: "Show in Code", ..., or "Open the chat". */
export const feedAction = (item: FeedItem): string => {
  const target = feedTarget(item)
  return target ? SHOW_LABELS[target.kind] : 'Open the chat'
}

/** "Read the page (24 times)" for a repeated call, the title alone for a single one. */
export const feedText = (title: string, count: number): string => (count > 1 ? `${title} (${count} times)` : title)

/** The last `limit` lines of what the agent did across chats; the most recently updated chat first, latest call first, equal calls in a row as one line. */
/** The step in plain words with its file or command ("Reading auth.ts"), else the tool title ("Read a file"). */
export function stepLabel(call: AguiToolCallState): string {
  const words = stepWords(call)
  return words && !GENERIC_STEPS.has(words) ? words.charAt(0).toUpperCase() + words.slice(1) : toolTitleOr(call.title)
}

/** Step words that name no file, command or query: the tool title says as much, so the feed keeps it. */
const GENERIC_STEPS = new Set(['reading a file', 'editing a file', 'writing a file', 'deleting a file', 'moving a file', 'running a command', 'searching the files', 'finding files', 'listing a folder', 'reading a web page'])

/** The text of a feed line: the step in plain words, with the repeat count. */
export function feedLabel(item: FeedItem): string {
  return feedText(stepLabel(item.call), item.count)
}

export function recentToolCalls(chats: readonly ChatActivityInput[], limit = 8): FeedItem[] {
  const ordered = [...chats].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
  const items: FeedItem[] = []
  for (const chat of ordered) {
    const entries = Object.entries(chat.toolCalls)
    for (let i = entries.length - 1; i >= 0; i--) {
      const last = items[items.length - 1]
      if (last && last.chatTitle === chat.title && stepLabel(last.call) === stepLabel(entries[i][1])) last.count++
      else items.push({ key: `${chat.sessionId}:${entries[i][0]}`, sessionId: chat.sessionId, toolCallId: entries[i][0], call: entries[i][1], cwd: chat.cwd ?? null, chatTitle: chat.title, title: entries[i][1].title, status: entries[i][1].status, count: 1 })
    }
  }
  return items.slice(0, limit)
}

/**
 * The chips the bar always shows: the Work the agent does most (read, write, run) and the Browser. What the agent may use
 * is the Control Center policy alone; no app has to be open (`docs/AGENT_PRESENCE.md`).
 */
const HEADLINE: Exclude<ToolGroup, 'shell'>[] = ['fs.read', 'fs.write', 'terminal', 'browser']

/** `on`: the agent just uses it; `asks`: it must ask first; `off`: denied in Control Center. */
export type ChipState = 'on' | 'asks' | 'off'

/** The word after the colon of a chip: the setting of Control Center, or Ask while "Ask before every action" is on. Off is never shown: a denied tool reads Deny. */
export type ChipWord = 'Allow' | 'Ask' | 'Deny'

export interface ToolChip {
  group: Exclude<ToolGroup, 'shell'>
  /** The chip text: `<Name>: <Allow|Ask first|Deny>`. "(now)" follows Ask first while "Ask before every action" is on and the saved setting is another (UX-173). */
  label: string
  /** The name before the colon. */
  name: string
  word: ChipWord
  state: ChipState
  /** The tooltip: "Open Control Center to change this.", then the setting and why the chip is as it is. */
  tooltip: string
}

/** The first words of every chip tooltip; a chip is a button that opens Control Center at Permissions (UX-142). */
export const OPEN_CONTROL_CENTRE = 'Open Control Center to change this.'

/** The second line of the tooltip and the aria label of a chip that reads Ask (UX-178). */
export const ASKS_YOU_FIRST = 'Asks you first.'

/** The name a screen reader reads for a chip: "Run commands: Ask. Asks you first. Open Control Center to change." */
export const chipAriaLabel = (chip: Pick<ToolChip, 'label' | 'word'>): string => `${chip.label}.${chip.word === 'Ask' ? ` ${ASKS_YOU_FIRST}` : ''} Open Control Center to change.`

const DECISION_WORD: Record<PolicyDecision, ChipWord> = { allow: 'Allow', ask: 'Ask', deny: 'Deny' }

/** The groups that are never a chip: the shell has no setting, and the apps that manage AgentXP ask on their own. */
const NOT_CHIPS: readonly ToolGroup[] = ['shell', 'board', 'scheduler', 'teams', 'rooms', 'settings', 'taskmgr', 'help']

/**
 * The tooltip of a chip; every chip has one. It names the setting and, when the chip differs from it, the reason; a chip that
 * reads Ask adds "Asks you first." on a second line (UX-178):
 * "Open Control Center to change this. Saved setting: Allow. You are in control, so the agent asks first." and "Asks you first."
 */
export function chipTooltip(name: string, word: ChipWord, setting: ChipWord): string {
  const parts = word === setting ? [`${name} is set to ${setting}.`] : [`Saved setting: ${setting}.`, 'You are in control, so the agent asks first.']
  if (word === 'Deny') parts.push('The agent cannot use it.')
  const lines = [`${OPEN_CONTROL_CENTRE} ${parts.join(' ')}`]
  if (word === 'Ask') lines.push(ASKS_YOU_FIRST)
  return lines.join('\n')
}

/**
 * Chips for the top bar, one pattern `<Name>: <Allow|Ask|Deny>`, from the Control Center policy (not from the open apps):
 * Read files, Write files, Run commands and Browser always, then every other tool that is set to Deny, so a blocked
 * tool is never hidden. The word is the setting (or Ask while `askFirst`, "Ask before every action"); "Off" is not a word
 * of the bar. A chip that reads Ask only because of the box reads "Ask first (now)", because the saved setting is another.
 */
export function toolChips(policy: ToolPolicyDto | null = null, askFirst = false): ToolChip[] {
  const chip = (group: Exclude<ToolGroup, 'shell'>, name: string): ToolChip => {
    const decision = policy?.groups[group] ?? 'allow'
    const setting = DECISION_WORD[decision]
    const word: ChipWord = decision === 'deny' ? 'Deny' : askFirst || decision === 'ask' ? 'Ask' : 'Allow'
    const state: ChipState = word === 'Deny' ? 'off' : word === 'Ask' ? 'asks' : 'on'
    const label = `${name}: ${word === 'Ask' ? 'Ask first' : word}${word !== setting && word === 'Ask' ? ' (now)' : ''}`
    return { group, name, word, state, label, tooltip: chipTooltip(name, word, setting) }
  }
  const headline = new Set<ToolGroup>(HEADLINE)
  const denied = TOOL_GROUPS.filter((g): g is Exclude<ToolGroup, 'shell'> => !NOT_CHIPS.includes(g) && !headline.has(g) && policy?.groups[g as Exclude<ToolGroup, 'shell'>] === 'deny')
  return [...HEADLINE, ...denied].map((g) => chip(g, PERMISSION_NAMES[g]))
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
  /** How many chats work now: with two or more the line reads "3 agents working" and opens the agents popup. */
  agents?: number
}

/** What taking control does to every tool, in one sentence (the bar, the Activity tile and the Take over tooltip use it). */
const CONTROL_SENTENCE = 'You are in control. All tools ask first until you click Resume.'
/** The bar adds that the mode is not kept (UX-199: the box, the bar and the Permissions page say the same thing). */
const NOT_KEPT = 'This is not saved.'
export const PAUSED_TEXT = 'Paused: no agent will act until you resume.'
/** The take-over line. It agrees with the chips: every tool asks first. */
export const controlText = (): string => `${CONTROL_SENTENCE} ${NOT_KEPT}`
/** The first line of the Activity taskpane while the user is in control and a step was running (UX-178: no "Stopped:"). */
export const CONTROL_NOTE = `You are in control. The agent asks first. ${NOT_KEPT}`
/**
 * What the box does not do (UX-173): it is not a saved setting. The bar and the Activity taskpane show it next to the
 * link that opens Permissions: `before`, the link text, `after`.
 */
export const NOT_SAVED_NOTE = { before: 'To keep a tool on Ask, change it in ', link: 'Control Center', after: '.' } as const
export const NOT_SAVED_TEXT = `${NOT_SAVED_NOTE.before}${NOT_SAVED_NOTE.link}${NOT_SAVED_NOTE.after}`
/** The mode in one phrase, in the check box, the bar and the Permissions page (UX-199). */
export const ASK_EVERY_ACTION = 'Ask before every action (this session only)'
/** The label of the take-control check box. */
export const TAKE_CONTROL_LABEL = ASK_EVERY_ACTION
export const PAUSE_TIP = 'Pause all agents on this desktop. Stop in a chat stops that chat only'
/** The same line while nothing was running: it is true and it does not sit over "Nothing has happened yet". */
export const CONTROL_IDLE_NOTE = `${CONTROL_SENTENCE} ${NOT_KEPT}`
/** The tooltip of the Browser's Take over button: what one click does to every tool (UX-143). */
export const TAKE_OVER_TIP = CONTROL_SENTENCE
/** The button in the bar that ends the take-over, and what it does. */
export const RESUME_CONTROL_BUTTON = 'Resume'
export const RESUME_CONTROL_TIP = 'The agent goes back to the settings in Control Center and no longer asks before every action.'

/** The first line of the Activity taskpane: null when the user is not in control; "Stopped" only when a step was running (`stoppedStep`: a chat was busy when control was taken) or was stopped. */
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
export function barStatus({ paused, userInControl, working, waiting = 0, waitingFor = null, notice = null, agents = 0 }: BarStatusInput): { state: BarState; text: string } {
  if (paused) return { state: 'paused', text: PAUSED_TEXT }
  if (userInControl) return { state: 'control', text: controlText() }
  if (waiting > 0) return { state: 'waiting', text: waitingFor ?? waitingText(waiting) }
  if (agents >= 2) return { state: 'working', text: agentsWorkingText(agents) }
  if (working) return { state: 'working', text: `Working: ${working}` }
  return { state: 'idle', text: notice ?? 'Idle' }
}
