import { describe, expect, it } from 'vitest'
import { lastReply } from './lastReply'

describe('lastReply', () => {
  it('is the latest assistant text', () => {
    expect(lastReply([{ role: 'assistant', content: 'one' }, { role: 'user', content: 'two' }, { role: 'assistant', content: 'three' }, { role: 'user', content: 'four' }])).toBe('three')
  })
  it('skips an assistant message with no text and is empty without one', () => {
    expect(lastReply([{ role: 'assistant', content: 'one' }, { role: 'assistant', content: '  ' }])).toBe('one')
    expect(lastReply([{ role: 'user', content: 'hi' }])).toBe('')
    expect(lastReply([])).toBe('')
  })
})
