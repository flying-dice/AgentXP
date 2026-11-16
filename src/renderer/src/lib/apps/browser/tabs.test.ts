import { describe, expect, it } from 'vitest'
import { closeTab, newTabState, parseTabsRequest, tabInfos, tabLabel } from './tabs'

const tabs = [newTabState(1, 'https://a.example/'), newTabState(2, 'https://b.example/'), newTabState(3, 'https://c.example/')]

describe('tab strip rules', () => {
  it('labels a tab by title, host or New Tab', () => {
    expect(tabLabel({ url: 'https://a.example/x', title: 'Page A' })).toBe('Page A')
    expect(tabLabel({ url: 'https://a.example/x', title: '' })).toBe('a.example')
    expect(tabLabel({ url: 'about:blank', title: '' })).toBe('New Tab')
  })

  it('closing the active tab activates the right neighbour, else the left', () => {
    expect(closeTab(tabs, 2, 2, 9)).toMatchObject({ activeId: 3, replaced: false })
    expect(closeTab(tabs, 3, 3, 9).activeId).toBe(2)
    expect(closeTab(tabs, 2, 2, 9).tabs.map((t) => t.id)).toEqual([1, 3])
  })

  it('closing another tab keeps the active one', () => {
    expect(closeTab(tabs, 1, 3, 9)).toMatchObject({ activeId: 1 })
  })

  it('replaces the last tab by a blank one and ignores unknown ids', () => {
    const last = closeTab([tabs[0]], 1, 1, 7)
    expect(last).toMatchObject({ activeId: 7, replaced: true })
    expect(last.tabs).toHaveLength(1)
    expect(closeTab(tabs, 1, 99, 9).tabs).toHaveLength(3)
  })

  it('lists tabs for the agent with the active one marked', () => {
    expect(tabInfos(tabs, 2).map((t) => `${t.id}${t.active ? '*' : ''}`)).toEqual(['1', '2*', '3'])
  })

  it('parses tabs requests', () => {
    expect(parseTabsRequest({ action: 'new', url: 'https://x.example/' })).toEqual({ action: 'new', url: 'https://x.example/', tab: undefined })
    expect(parseTabsRequest({ action: 'switch', tab: 2 }).tab).toBe(2)
    expect(() => parseTabsRequest({ action: 'explode' })).toThrow(/Unknown tabs action/)
  })
})
