import { describe, expect, it } from 'vitest'
import { closeChatBalloon, closeChatText, CLOSE_CHAT_TEXT, CLOSE_CHAT_ACTION } from './closeChat'

const chat = { app: 'chat' as const, sessionId: 1, title: 'Chat' }

describe('closeChatBalloon (UX-136)', () => {
  it('says that the agent goes on when a turn is running or waits for an answer', () => {
    expect(closeChatBalloon(chat, 'working')?.text).toBe(CLOSE_CHAT_TEXT)
    expect(closeChatBalloon(chat, 'awaiting_permission')?.text).toBe(CLOSE_CHAT_TEXT)
    expect(closeChatBalloon(chat, 'working')?.action).toBe(CLOSE_CHAT_ACTION)
    expect(CLOSE_CHAT_TEXT).toContain('Chats')
  })
  it('names the chat when it has a title (UX-163)', () => {
    expect(closeChatBalloon(chat, 'working', 'start the long job')?.text).toBe('"start the long job" is still working. Open it again from Chats on the desktop.')
    expect(closeChatText('')).toContain('New chat')
  })
  it('says nothing for an idle chat or another window', () => {
    expect(closeChatBalloon(chat, 'idle')).toBeNull()
    expect(closeChatBalloon(chat, undefined)).toBeNull()
    expect(closeChatBalloon({ app: 'agent-manager' }, 'working')).toBeNull()
  })
})
