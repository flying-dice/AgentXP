import { describe, expect, it } from 'vitest'
import { focusedTestids, helpTopicFor } from './helpFocus'

interface Fake {
  testid?: string
  frame?: boolean
  parentElement: Fake | null
  matches: (selector: string) => boolean
  getAttribute: (name: string) => string | null
}
const el = (testid: string | undefined, parent: Fake | null, frame = false): Fake => ({
  testid,
  frame,
  parentElement: parent,
  matches: () => frame,
  getAttribute: (name) => (name === 'data-testid' ? (testid ?? null) : null)
})

describe('F1 on a control (UX-205)', () => {
  const frame = el('window-notepad', null, true)
  const toolbar = el('notepad-toolbar', frame)
  const text = el('notepad-text', el(undefined, toolbar))

  it('lists the test ids from the focused element up to its window, innermost first', () => {
    expect(focusedTestids(text as unknown as Element)).toEqual(['notepad-text', 'notepad-toolbar'])
    expect(focusedTestids(null)).toEqual([])
  })

  it('opens the topic alone when no control is focused or the manual does not list it, and at its row when it does', () => {
    expect(helpTopicFor('notepad', null)).toBe('notepad')
    expect(helpTopicFor('notepad', el('not-in-the-manual', frame) as unknown as Element)).toBe('notepad')
    expect(helpTopicFor('notepad', text as unknown as Element)).toBe('notepad#control:Text editor')
  })
})
