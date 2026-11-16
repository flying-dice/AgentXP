import { describe, expect, it } from 'vitest'
import { closeChatBalloon, CLOSE_CHAT_TEXT, CLOSE_CHAT_ACTION } from './closeChat'

const chat = { app: 'chat' as const, sessionId: 1, title: 'Chat' }

describe('closeChatBalloon (UX-136)', () => {
  it('says that the agent goes on when a turn is running or waits for an answer', () => {
    expect(closeChatBalloon(chat, 'working')?.text).toBe(CLOSE_CHAT_TEXT)
    expect(closeChatBalloon(chat, 'awaiting_permission')?.text).toBe(CLOSE_CHAT_TEXT)
    expect(closeChatBalloon(chat, 'working')?.action).toBe(CLOSE_CHAT_ACTION)
    expect(CLOSE_CHAT_TEXT).toContain('Chats')
  })
  it('says nothing for an idle chat or another window', () => {
    expect(closeChatBalloon(chat, 'idle')).toBeNull()
    expect(closeChatBalloon(chat, undefined)).toBeNull()
    expect(closeChatBalloon({ app: 'agent-manager' }, 'working')).toBeNull()
  })
})
