import { describe, expect, it } from 'vitest'
import { ctrlNStartsChat, isCtrlN } from './shellKeys'

describe('Ctrl+N', () => {
  it('starts a chat from the desktop and from Code and Explorer only (Chat has its own)', () => {
    expect([null, undefined, 'code', 'explorer', 'chat'].map((app) => ctrlNStartsChat(app as never))).toEqual([true, true, true, true, false])
    expect(['notepad', 'wordpad', 'paint', 'terminal', 'browser'].map((app) => ctrlNStartsChat(app as never))).toEqual([false, false, false, false, false])
  })

  it('is Ctrl+N and nothing else', () => {
    const key = (init: Partial<KeyboardEvent>): boolean => isCtrlN({ ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, key: 'n', ...init })
    expect(key({ ctrlKey: true })).toBe(true)
    expect(key({ ctrlKey: true, key: 'N' })).toBe(true)
    expect(key({ ctrlKey: true, shiftKey: true })).toBe(false)
    expect(key({ key: 'n' })).toBe(false)
    expect(key({ ctrlKey: true, key: 'o' })).toBe(false)
  })
})
