import { describe, expect, it } from 'vitest'
import { matchShortcut, shortcutLabel } from './shortcuts'

const key = (k: string, mods: Partial<{ ctrlKey: boolean; shiftKey: boolean; altKey: boolean }> = {}) => ({
  key: k,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...mods
})

describe('matchShortcut', () => {
  it('matches Ctrl+N and Ctrl+Shift+C exactly', () => {
    expect(matchShortcut(key('n', { ctrlKey: true }))?.command).toBe('session.new')
    expect(matchShortcut(key('C', { ctrlKey: true, shiftKey: true }))?.command).toBe('edit.copyLast')
    expect(matchShortcut(key('c', { ctrlKey: true }))).toBeNull()
  })

  it('matches plain keys only without modifiers', () => {
    expect(matchShortcut(key('Escape'))?.command).toBe('session.stop')
    expect(matchShortcut(key('Escape', { ctrlKey: true }))).toBeNull()
    expect(matchShortcut(key('F1'))?.command).toBe('help.help')
  })

  it('never claims the OS-handled Alt+F4', () => {
    expect(matchShortcut(key('F4', { altKey: true }))).toBeNull()
    expect(shortcutLabel('app.exit')).toBe('Alt+F4')
  })
})
