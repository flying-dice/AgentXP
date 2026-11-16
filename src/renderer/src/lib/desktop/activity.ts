/** Pure summaries of what the agent is doing, from the chats of a desktop. */
import type { AguiToolCallState } from '@shared/agui-state'
import type { SessionStatus, ToolCallStatus } from '@shared/models'
import type { ToolGroup } from '@shared/desktop'

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
  browser: 'Browser'
}

/** Chips for the top bar: the tool groups the agent can use right now (the always-on shell group is left out). */
export const toolChips = (tools: readonly ToolGroup[]): { group: ToolGroup; label: string }[] =>
  tools.filter((g): g is Exclude<ToolGroup, 'shell'> => g !== 'shell').map((group) => ({ group, label: CHIP_LABELS[group] }))
