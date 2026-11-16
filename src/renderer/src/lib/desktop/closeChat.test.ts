import { describe, expect, it } from 'vitest'
import { closeChatBalloon, CLOSE_CHAT_TEXT } from './closeChat'

const chat = { app: 'chat' as const, sessionId: 1, title: 'Chat' }

describe('closeChatBalloon (UX-136)', () => {
  it('says that the agent goes on when a turn is running or waits for an answer', () => {
    expect(closeChatBalloon(chat, 'working')?.text).toBe(CLOSE_CHAT_TEXT)
    expect(closeChatBalloon(chat, 'awaiting_permission')?.text).toBe(CLOSE_CHAT_TEXT)
  })
  it('says nothing for an idle chat or another window', () => {
    expect(closeChatBalloon(chat, 'idle')).toBeNull()
    expect(closeChatBalloon(chat, undefined)).toBeNull()
    expect(closeChatBalloon({ app: 'agent-manager' }, 'working')).toBeNull()
  })
})
