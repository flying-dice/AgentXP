/** What a chat with no message is called. The name in the row is the first words of the first message once there is one. */
export const NEW_CHAT_TITLE = 'New chat'

/**
 * The names of chats as the title bar and the taskbar show them: chats with the same title get " (2)", " (3)" in the
 * order they were started, so two windows can be told apart. The first one keeps the plain title.
 */
export function chatTitleLabels(chats: readonly { id: number; title: string }[]): Map<number, string> {
  const labels = new Map<number, string>()
  const seen = new Map<string, number>()
  for (const chat of [...chats].sort((a, b) => a.id - b.id)) {
    const title = chat.title.trim() || NEW_CHAT_TITLE
    const count = (seen.get(title) ?? 0) + 1
    seen.set(title, count)
    labels.set(chat.id, count === 1 ? title : `${title} (${count})`)
  }
  return labels
}
