import { describe, expect, it } from 'vitest'
import { closeTab, openTab, reconcileTabs, sameRange, scrollTopForLine, visibleRange } from './codeModel'

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
