import type { Message } from '@ag-ui/core'

/** The text of the agent's latest reply in a chat ('' when it has said nothing yet): a form quotes it after Send. */
export function lastReply(messages: readonly Pick<Message, 'role' | 'content'>[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'assistant' && typeof m.content === 'string' && m.content.trim()) return m.content
  }
  return ''
}
