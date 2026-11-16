import { describe, expect, it } from 'vitest'
import { ALL_PANES, NO_PANES, closeTab, focusKey, isFocused, openTab, readLayout, reconcileTabs, sameRange, scrollTopForLine, toggleFocus, visibleRange, writeLayout } from './codeModel'

describe('tabs', () => {
  it('opens a tab once and activates it', () => {
    const a = openTab({ tabs: [], active: null }, 'a.ts')
    const b = openTab(openTab(a, 'b.ts'), 'a.ts')
    expect(b).toEqual({ tabs: ['a.ts', 'b.ts'], active: 'a.ts' })
  })

  it('activates the left neighbour when the active tab closes', () => {
    const state = { tabs: ['a', 'b', 'c'], active: 'b' }
    expect(closeTab(state, 'b')).toEqual({ tabs: ['a', 'c'], active: 'a' })
    expect(closeTab({ tabs: ['a', 'b'], active: 'a' }, 'a')).toEqual({ tabs: ['b'], active: 'b' })
    expect(closeTab({ tabs: ['a'], active: 'a' }, 'a')).toEqual({ tabs: [], active: null })
    expect(closeTab(state, 'c')).toEqual({ tabs: ['a', 'b'], active: 'b' })
    expect(closeTab(state, 'zzz')).toBe(state)
  })

  it('makes the active file a tab', () => {
    expect(reconcileTabs(['a', 'a'], 'b')).toEqual({ tabs: ['a', 'b'], active: 'b' })
    expect(reconcileTabs(['a'], null)).toEqual({ tabs: ['a'], active: 'a' })
    expect(reconcileTabs([], null)).toEqual({ tabs: [], active: null })
  })
})

describe('visible lines', () => {
  it('computes the range from the scroll position', () => {
    expect(visibleRange(0, 170, 17, 100)).toEqual([1, 10])
    expect(visibleRange(170, 170, 17, 100)).toEqual([11, 20])
    expect(visibleRange(0, 170, 17, 4)).toEqual([1, 4])
    expect(visibleRange(0, 170, 17, 0)).toEqual([1, 1])
  })

  it('scrolls a line into the upper third', () => {
    expect(scrollTopForLine(1, 300, 17)).toBe(0)
    expect(scrollTopForLine(50, 300, 17)).toBe(49 * 17 - 100)
  })

  it('compares ranges', () => {
    expect(sameRange([1, 2], [1, 2])).toBe(true)
    expect(sameRange([1, 2], [1, 3])).toBe(false)
    expect(sameRange(null, null)).toBe(true)
    expect(sameRange(null, [1, 1])).toBe(false)
  })
})

describe('focus on the file', () => {
  it('closes every pane and remembers the ones that were open', () => {
    const open = { management: true, logs: false, chat: true }
    const focused = toggleFocus(open, null)
    expect(focused).toEqual({ panes: NO_PANES, remembered: open })
    expect(isFocused(focused.panes)).toBe(true)
  })

  it('brings back what was open, or every pane when nothing is remembered', () => {
    const open = { management: true, logs: false, chat: true }
    expect(toggleFocus(NO_PANES, open)).toEqual({ panes: open, remembered: null })
    expect(toggleFocus(NO_PANES, null).panes).toEqual(ALL_PANES)
    expect(toggleFocus(NO_PANES, NO_PANES).panes).toEqual(ALL_PANES)
  })

  it('is a toggle: twice gives the same panes', () => {
    const open = { management: false, logs: true, chat: false }
    const once = toggleFocus(open, null)
    expect(toggleFocus(once.panes, once.remembered).panes).toEqual(open)
  })

  it('remembers the layout per window and ignores junk', () => {
    const data = new Map<string, string>()
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
    const key = focusKey(1, 4)
    expect(readLayout(storage, key)).toEqual({ management: true, logs: true, restore: null })
    writeLayout(storage, key, { management: false, logs: false, restore: { management: true, logs: true, chat: true } })
    expect(readLayout(storage, key)).toEqual({ management: false, logs: false, restore: { management: true, logs: true, chat: true } })
    expect(readLayout(storage, focusKey(1, 5)).management).toBe(true)
    data.set(key, '{nope')
    expect(readLayout(storage, key).management).toBe(true)
    expect(readLayout(null, key).logs).toBe(true)
  })
})
