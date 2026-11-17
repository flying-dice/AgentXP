import { describe, expect, it } from 'vitest'
import { aboutLine } from './aboutText'

describe('aboutLine (UX-192, UX-206)', () => {
  it('says the program is part of AgentXP and has no version of its own', () => {
    expect(aboutLine('Notepad', '0.1.0')).toBe('Notepad is part of AgentXP (version 0.1.0). It has no separate version.')
  })
  it('leaves the version out until it is loaded', () => {
    expect(aboutLine('Notepad')).toBe('Notepad is part of AgentXP.')
  })
})
