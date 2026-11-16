import { describe, expect, it } from 'vitest'
import { modeButtonText, modeDescription, modeMenuItems } from './modeMenu'

const modes = [
  { id: 'default', name: 'Default', description: null },
  { id: 'plan', name: 'Plan', description: 'Read-only planning (agent text)' },
  { id: 'accept', name: 'Accept edits', description: null }
]

describe('modeMenuItems', () => {
  it('describes each mode in plain words, the agent\'s own text first', () => {
    expect(modeDescription(modes[0]!)).toBe('The agent works as usual.')
    expect(modeDescription(modes[1]!)).toBe('Read-only planning (agent text)')
    expect(modeDescription(modes[2]!)).toBeNull()
  })

  it('lists the modes, then a separator and "Ask before every action" that shows its state', () => {
    const picked: string[] = []
    const asked: boolean[] = []
    const items = modeMenuItems({ modes, modeId: 'plan', onmode: (id) => picked.push(id), askFirst: true, onaskfirst: (on) => asked.push(on) })
    expect(items.map((i) => i.label ?? '---')).toEqual([
      'Default - The agent works as usual.',
      'Plan - Read-only planning (agent text)',
      'Accept edits',
      '---',
      'Ask before every action'
    ])
    expect(items.filter((i) => i.radio).map((i) => i.checked)).toEqual([false, true, false])
    expect(items.at(-1)).toMatchObject({ testid: 'chat-mode-ask-first', checked: true })
    items[0]!.action?.()
    items.at(-1)!.action?.()
    expect(picked).toEqual(['default'])
    expect(asked).toEqual([false])
  })

  it('leaves the ask-first entry out when nothing handles it', () => {
    expect(modeMenuItems({ modes, modeId: null, onmode: () => {} }).some((i) => i.separator)).toBe(false)
  })

  it('names the current mode on the button', () => {
    expect(modeButtonText(modes, 'plan')).toBe('Mode: Plan')
    expect(modeButtonText([], null)).toBe('Mode: Default')
  })
})
