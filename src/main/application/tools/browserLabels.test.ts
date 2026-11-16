import { describe, expect, it } from 'vitest'
import { clickLabel, findLabel, selectLabel, tabsLabel, typeLabel } from './browserLabels'

describe('browser activity labels', () => {
  it('names the clicked element and never shows a ref', () => {
    expect(clickLabel({ role: 'button', name: 'Send' })).toBe("Clicking the button 'Send'")
    expect(clickLabel({ role: 'link', name: 'More' }, true)).toBe("Double-clicking the link 'More'")
    expect(clickLabel({ role: 'listitem', name: 'general' })).toBe("Clicking 'general'")
    expect(clickLabel({ role: 'button', name: '' })).toBe('Clicking a button')
    expect(clickLabel(undefined)).toBe('Clicking an item on the page')
  })

  it('says which box the agent types into', () => {
    expect(typeLabel({ role: 'textbox', name: 'Message' })).toBe('Typing into the message box')
    expect(typeLabel({ role: 'searchbox', name: 'Search field' })).toBe('Typing into the search field')
    expect(typeLabel({ role: 'textbox', name: '' })).toBe('Typing into a text box')
    expect(typeLabel({ role: 'generic', name: 'Editor' })).toBe("Typing into 'Editor'")
    expect(typeLabel(undefined)).toBe('Typing')
  })

  it('shortens a long name and drops quotes', () => {
    const label = clickLabel({ role: 'button', name: `Say "hello" ${'x'.repeat(80)}` })
    expect(label).not.toContain('"')
    expect(label.length).toBeLessThan(80)
    expect(label.endsWith("...'")).toBe(true)
  })

  it('words select, find and tabs', () => {
    expect(selectLabel({ role: 'combobox', name: 'Country' })).toBe('Choosing an option in the Country list')
    expect(findLabel({ text: 'Send' })).toBe("Looking for 'Send' on the page")
    expect(findLabel({ role: 'button' })).toBe('Looking for a button on the page')
    expect(tabsLabel('switch', 2)).toBe('Switching to tab 2')
    expect(tabsLabel('list')).toBe('Looking at the tabs')
  })
})
