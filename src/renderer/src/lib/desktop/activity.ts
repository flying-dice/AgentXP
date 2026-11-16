/** Pure summaries of what the agent is doing, from the chats of a desktop. */
import type { AguiToolCallState } from '@shared/agui-state'
import type { SessionStatus, ToolCallStatus } from '@shared/models'
import type { ToolGroup, ToolPolicyDto } from '@shared/desktop'

export interface ChatActivityInput {
  sessionId: number
  title: string
  status: SessionStatus
  /** ISO date; newest chats come first in the feed. */
  updatedAt?: string
  toolCalls: Record<string, AguiToolCallState>
}

const RUNNING: readonly ToolCallStatus[] = ['pending', 'in_progress']

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
  return first.status === 'awaiting_permission' ? 'Waiting for approval' : first.title || 'Thinking'
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
  terminal: 'Terminal',
  browser: 'Browser',
  paint: 'Paint',
  wordpad: 'WordPad',
  notes: 'Notes',
  events: 'Events',
  snip: 'Screen capture',
  recycle: 'Recycle Bin',
  review: 'Code review'
}

/** The three chips the bar always shows, so "run commands: off" can be read without guessing. */
const HEADLINE: { group: Exclude<ToolGroup, 'shell'>; label: string }[] = [
  { group: 'fs.read', label: 'Read files' },
  { group: 'terminal', label: 'Run commands' },
  { group: 'browser', label: 'Browser' }
]

/** `on`: the agent just uses it; `asks`: it must ask first; `off`: not available (denied, or its app is closed). */
export type ChipState = 'on' | 'asks' | 'off'

export interface ToolChip {
  group: Exclude<ToolGroup, 'shell'>
  /** The chip text: the name and, when not plainly on, " (asks)" or " (off)". */
  label: string
  state: ChipState
}

const SUFFIX: Record<ChipState, string> = { on: '', asks: ' (asks)', off: ' (off)' }

/**
 * Chips for the top bar. Read files, Run commands and Browser are always there; the other tool groups appear while
 * their app is open (`tools` is what the open apps give the agent). With `askFirst` ("Ask before every action") every
 * chip that is not off reads "(asks)".
 */
export function toolChips(tools: readonly ToolGroup[], policy: ToolPolicyDto | null = null, askFirst = false): ToolChip[] {
  const open = new Set(tools)
  const chip = (group: Exclude<ToolGroup, 'shell'>, name: string): ToolChip => {
    const decision = policy?.groups[group] ?? 'allow'
    const state: ChipState = decision === 'deny' || !open.has(group) ? 'off' : askFirst || decision === 'ask' ? 'asks' : 'on'
    return { group, label: `${name}${SUFFIX[state]}`, state }
  }
  const headline = new Set<ToolGroup>(HEADLINE.map((h) => h.group))
  const others = tools.filter((g): g is Exclude<ToolGroup, 'shell'> => g !== 'shell' && !headline.has(g))
  return [...HEADLINE.map((h) => chip(h.group, h.label)), ...others.map((g) => chip(g, CHIP_LABELS[g]))]
}

/** True when no app gives the agent a tool (the bar then adds "open an app"). */
export const noToolsOpen = (tools: readonly ToolGroup[]): boolean => tools.every((g) => g === 'shell')
