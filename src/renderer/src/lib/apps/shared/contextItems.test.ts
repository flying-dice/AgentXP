import { describe, expect, it, vi } from 'vitest'
import { askAboutFileItem, askChatItems, selectionLines, startChatHereItem } from './contextItems'

describe('askChatItems', () => {
  it('lists the same two chat items in every app: Ask the agent about this..., Explain this', () => {
    const ask = vi.fn()
    const items = askChatItems('notepad', { hasSelection: true, ask })
    expect(items[0].separator).toBe(true)
    expect(items.slice(1).map((i) => i.testid)).toEqual(['notepad-ctx-ask', 'notepad-ctx-explain'])
    expect(items.slice(1).map((i) => i.label)).toEqual(['&Ask the agent about this...', '&Explain this'])
    items.slice(1).forEach((i) => i.action?.())
    expect(ask.mock.calls.map((c) => c[0])).toEqual(['ask', 'explain'])
  })

  it('needs a selection for Explain this only', () => {
    const items = askChatItems('code', { hasSelection: false, ask: () => {} })
    expect(items.filter((i) => i.disabled).map((i) => i.testid)).toEqual(['code-ctx-explain'])
  })
})

describe('file chat items', () => {
  it('name what they do: pane for a file, window for a folder or drive', () => {
    const ask = vi.fn()
    const start = vi.fn()
    const askItem = askAboutFileItem('code', ask)
    const startItem = startChatHereItem('code', start)
    expect(askItem).toMatchObject({ testid: 'code-ctx-ask', label: 'Ask &chat about this file...' })
    expect(startItem).toMatchObject({ testid: 'code-ctx-start-chat', label: 'Start a &chat here' })
    askItem.action?.()
    startItem.action?.()
    expect([ask.mock.calls.length, start.mock.calls.length]).toEqual([1, 1])
  })
})

describe('selectionLines', () => {
  const text = 'a\nbb\nccc\n'
  it('gives the lines of the start and the end', () => {
    expect(selectionLines(text, 0, 1)).toEqual({ startLine: 1, endLine: 1 })
    expect(selectionLines(text, 2, 7)).toEqual({ startLine: 2, endLine: 3 })
  })
  it('stops on the line before a trailing newline', () => {
    expect(selectionLines(text, 0, 5)).toEqual({ startLine: 1, endLine: 2 })
  })
  it('accepts a reversed selection', () => {
    expect(selectionLines(text, 7, 2)).toEqual({ startLine: 2, endLine: 3 })
  })
})

import { quoteText, transcriptItems } from './contextItems'

describe('quoteText', () => {
  it('prefixes every line and leaves room for the reply', () => {
    expect(quoteText('a\n\nb\n')).toBe('> a\n>\n> b\n\n')
  })
})

describe('transcriptItems', () => {
  it('copies the message and the code, and quotes the message', () => {
    const copy = vi.fn()
    const quote = vi.fn()
    const items = transcriptItems({ message: 'hello', code: 'x()', copy, quote })
    expect(items.filter((i) => i.testid).map((i) => i.testid)).toEqual(['chat-ctx-copy-message', 'chat-ctx-copy-code', 'chat-ctx-quote'])
    items.forEach((i) => i.action?.())
    expect(copy.mock.calls).toEqual([['hello'], ['x()']])
    expect(quote).toHaveBeenCalledWith('hello')
  })

  it('disables what has nothing to act on', () => {
    const items = transcriptItems({ message: '', code: '', copy: () => {}, quote: () => {} })
    expect(items.filter((i) => i.testid).every((i) => i.disabled)).toBe(true)
    expect(transcriptItems({ message: 'x', code: '', copy: () => {}, quote: () => {} }).find((i) => i.testid === 'chat-ctx-copy-code')?.disabled).toBe(true)
  })
})
