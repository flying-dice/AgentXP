import { describe, expect, it } from 'vitest'
import { DEFAULT_PANE, PANE_DEFAULT_WIDTH, PANE_MAX_WIDTH, PANE_MIN_WIDTH, paneMaxWidth, composeAppContext, explainChip, explainRequest, paneKey, readPane, suggestionsFor, writePane } from './chatPane'
import { askChatPrompt } from '../apps/askChat'

const memory = (initial: Record<string, string> = {}): Storage => {
  const data = new Map(Object.entries(initial))
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) } as Storage
}

describe('pane state', () => {
  it('starts collapsed with the default width', () => {
    expect(readPane(memory(), 'k')).toEqual({ collapsed: true, width: PANE_DEFAULT_WIDTH })
    expect(DEFAULT_PANE.collapsed).toBe(true)
  })

  it('remembers collapsed state and width per window key', () => {
    const storage = memory()
    writePane(storage, paneKey(1, 7), { collapsed: false, width: 400 })
    expect(readPane(storage, paneKey(1, 7))).toEqual({ collapsed: false, width: 400 })
    expect(readPane(storage, paneKey(1, 8)).collapsed).toBe(true)
    expect(paneKey(1, 7)).not.toBe(paneKey(2, 7))
  })

  it('clamps the width and ignores junk', () => {
    expect(readPane(memory({ k: JSON.stringify({ collapsed: false, width: 9000 }) }), 'k')).toEqual({ collapsed: false, width: PANE_MAX_WIDTH })
    expect(readPane(memory({ k: 'not json' }), 'k')).toEqual(DEFAULT_PANE)
    expect(readPane(memory({ k: JSON.stringify({ width: 'wide' }) }), 'k')).toEqual(DEFAULT_PANE)
  })

  it('survives storage that throws or is missing', () => {
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(readPane(broken, 'k')).toEqual(DEFAULT_PANE)
    expect(() => writePane(broken, 'k', DEFAULT_PANE)).not.toThrow()
    expect(readPane(null, 'k')).toEqual(DEFAULT_PANE)
    expect(() => writePane(null, 'k', DEFAULT_PANE)).not.toThrow()
  })
})

describe('composeAppContext', () => {
  it('names the window and lets the app add to it (or override the title)', () => {
    const win = { id: 4, app: 'code' as const, title: 'a.ts - Code' }
    expect(composeAppContext(win, undefined)).toEqual({ windowId: 4, app: 'code', title: 'a.ts - Code' })
    expect(composeAppContext(win, { openFile: 'E:\\a.ts', title: 'A' })).toEqual({ windowId: 4, app: 'code', title: 'A', openFile: 'E:\\a.ts' })
  })
})

describe('the chip Explain this', () => {
  const selected = { openFile: 'E:\\src\\index.ts', selection: 'a\nb', range: { startLine: 1, endLine: 2 } }

  it('sends the selection with the lines and the file, the same message as the right-click route', () => {
    const chip = suggestionsFor('code', selected, 3).find((s) => s.id === 'explain')!
    expect(chip.disabled).toBeUndefined()
    expect(chip.text.split('\n')[0]).toBe('Explain lines 1 to 2 of index.ts.')
    expect(chip.text).toContain('```ts\na\nb\n```')
    expect(chip.text).toBe(askChatPrompt({ app: 'code', windowId: 3, kind: 'explain', path: 'E:\\src\\index.ts', text: 'a\nb', range: { startLine: 1, endLine: 2 } }))
  })

  it('is disabled with the tooltip "Select some text first." while nothing is selected, and still sends only text that exists', () => {
    const chip = suggestionsFor('code', { openFile: 'E:\\src\\index.ts' }, 3).find((s) => s.id === 'explain')!
    expect(chip).toMatchObject({ disabled: true, tip: 'Select some text first.' })
    expect(explainRequest('code', 3, { openFile: 'E:\\a.ts', selection: '   ' })).toBeNull()
    expect(explainChip('notepad', 1, {})).toMatchObject({ disabled: true, tip: 'Select some text first.' })
  })

  it('works in the other apps: Browser page, Terminal output, Explorer item, Event Viewer row', () => {
    expect(explainRequest('browser', 2, { selection: 'hi', url: 'https://example.com/', title: 'Example' })).toMatchObject({ kind: 'explain', url: 'https://example.com/', text: 'hi' })
    expect(explainRequest('terminal', 2, { lastOutput: ['ok', 'done'] })).toMatchObject({ text: 'ok\ndone' })
    expect(explainRequest('explorer', 2, { selectedItems: ['E:\\src'] })).toEqual({ app: 'explorer', windowId: 2, kind: 'explain', path: 'E:\\src' })
    expect(explainRequest('explorer', 2, { selectedItems: [] })).toBeNull()
    expect(explainRequest('event-viewer', 2, { selectedRow: { id: 9, source: 'acp', name: 'session/prompt', payload: '{}' } })?.text).toBe('Event 9, acp session/prompt\n{}')
  })
})

describe('suggestionsFor', () => {
  it('offers file questions in Code once a file is open', () => {
    expect(suggestionsFor('code', { openFile: 'E:\\a.ts' }).map((s) => s.label)).toEqual(['Explain this', 'What changed in this file?', 'Any bugs here?'])
    expect(suggestionsFor('code', {}).map((s) => s.label)).toEqual(['What can I do here?'])
  })

  it('follows the selection in the text apps and the Browser', () => {
    expect(suggestionsFor('notepad', { selection: 'x' }).map((s) => s.label)).toContain('Summarise the selection')
    expect(suggestionsFor('browser', {}).map((s) => s.label)).toEqual(['Summarise this page', 'What are the main links?'])
    expect(suggestionsFor('browser', { selection: 'x' }).map((s) => s.label)).toEqual(['Summarise this page', 'Explain this'])
  })

  it('has chips for every app and sends a text for each', () => {
    for (const app of ['code', 'notepad', 'wordpad', 'explorer', 'terminal', 'browser', 'event-viewer', 'agent-manager', 'recycle-bin', 'paint', 'diagrams', 'sticky-notes', 'kanban', 'help', 'control-centre', 'snipping-tool', 'task-scheduler'] as const) {
      const chips = suggestionsFor(app, null)
      expect(chips.length).toBeGreaterThan(0)
      for (const c of chips) expect(c.text.length).toBeGreaterThan(0)
    }
  })
})

describe('paneMaxWidth (UX-198)', () => {
  it('is 60 percent of a wide window', () => {
    expect(paneMaxWidth(2000)).toBe(1200)
  })
  it('leaves the app 380 px in a mid-size window, and an 800 px window its 420 px pane (UX-126)', () => {
    expect(paneMaxWidth(900)).toBe(520)
    expect(paneMaxWidth(800)).toBe(420)
    expect(paneMaxWidth(760)).toBe(380)
  })
  it('never goes under the narrowest pane', () => {
    expect(paneMaxWidth(500)).toBe(PANE_MIN_WIDTH)
  })
})
