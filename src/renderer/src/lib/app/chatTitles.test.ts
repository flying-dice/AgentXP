import { describe, expect, it } from 'vitest'
import { chatTitleLabels } from './chatTitles'

describe('chatTitleLabels', () => {
  it('numbers chats with the same title in the order they were started', () => {
    const labels = chatTitleLabels([
      { id: 7, title: 'hello' },
      { id: 3, title: 'hello' },
      { id: 5, title: 'Fix the login' },
      { id: 9, title: 'hello' }
    ])
    expect(labels.get(3)).toBe('hello')
    expect(labels.get(7)).toBe('hello (2)')
    expect(labels.get(9)).toBe('hello (3)')
    expect(labels.get(5)).toBe('Fix the login')
  })

  it('calls a chat without a title "New chat" and numbers those too', () => {
    const labels = chatTitleLabels([
      { id: 1, title: '' },
      { id: 2, title: 'New chat' }
    ])
    expect(labels.get(1)).toBe('New chat')
    expect(labels.get(2)).toBe('New chat (2)')
  })
})
