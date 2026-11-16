import { describe, expect, it } from 'vitest'
import type { AppView, AskChatRequest } from '@shared/desktop'
import { askChatCwd, askChatDraft, askChatPrompt, fenced, rangeLabel, rangePhrase } from './askChat'

const base: AskChatRequest = { app: 'code', windowId: 1, kind: 'explain' }

describe('fenced', () => {
  it('uses a fence longer than any backtick run inside', () => {
    expect(fenced('a', 'ts')).toBe('```ts\na\n```')
    expect(fenced('x ``` y')).toBe('````\nx ``` y\n````')
  })
})

describe('rangeLabel', () => {
  it('names one line or a range', () => {
    expect(rangeLabel(undefined)).toBe('')
    expect(rangeLabel({ startLine: 7, endLine: 7 })).toBe('line 7')
    expect(rangeLabel({ startLine: 3, endLine: 5 })).toBe('lines 3-5')
  })
})

describe('rangePhrase', () => {
  it('says "lines 1 to 2" in the words of the explain message', () => {
    expect(rangePhrase(undefined)).toBe('')
    expect(rangePhrase({ startLine: 7, endLine: 7 })).toBe('line 7')
    expect(rangePhrase({ startLine: 1, endLine: 2 })).toBe('lines 1 to 2')
  })
})

describe('askChatPrompt', () => {
  it('starts an explain message with "Explain lines 1 to 2 of index.ts", the same text for the pane chip and the right-click route', () => {
    const request: AskChatRequest = { ...base, path: 'E:\\src\\index.ts', range: { startLine: 1, endLine: 2 }, text: 'a\nb' }
    expect(askChatPrompt(request).split('\n')[0]).toBe('Explain lines 1 to 2 of index.ts.')
    expect(askChatPrompt({ ...request, kind: 'ask' })).toContain('I have a question about')
  })
  it('explains a whole file by its name', () => {
    expect(askChatPrompt({ ...base, app: 'explorer', path: 'E:\\src\\index.ts' }).split('\n')[0]).toBe('Explain index.ts.')
  })

  it('gives the file, the line range and the selection in a fenced block', () => {
    const prompt = askChatPrompt({ ...base, path: 'E:\\src\\a.ts', range: { startLine: 3, endLine: 5 }, text: 'const x = 1' })
    expect(prompt).toContain('Explain lines 3 to 5 of a.ts.\nFile: E:\\src\\a.ts')
    expect(prompt).toContain('```ts\nconst x = 1\n```')
  })

  it('says a question follows for Ask the agent about this...', () => {
    expect(askChatPrompt({ ...base, kind: 'ask', path: 'E:\\a.md', text: 'hi' })).toContain('I have a question about')
    expect(askChatPrompt({ ...base, kind: 'ask', path: 'E:\\a.md', text: 'hi' })).toContain('My question follows')
  })

  it('names the page by address and title', () => {
    const prompt = askChatPrompt({ app: 'browser', windowId: 2, kind: 'ask', url: 'https://example.com/', title: 'Example' })
    expect(prompt).toContain('the page "Example" at https://example.com/')
    expect(prompt).not.toContain('```')
  })

  it('names Terminal output and a plain selection', () => {
    expect(askChatPrompt({ app: 'terminal', windowId: 3, kind: 'send', text: 'ok' })).toContain('Here is this Terminal output.')
    expect(askChatPrompt({ app: 'notepad', windowId: 4, kind: 'explain', text: 'hello' })).toContain('this text from the Notepad app')
  })

  it('names a file or folder with no text', () => {
    expect(askChatPrompt({ app: 'explorer', windowId: 5, kind: 'ask', path: 'E:\\src' })).toContain('about E:\\src.')
  })
})

describe('askChatCwd', () => {
  const home = 'C:\\Users\\Agent'
  const windows: { id: number; view: AppView }[] = [{ id: 9, view: { app: 'notepad', path: 'F:\\notes\\a.txt', dirty: false, caretLine: 1 } }]

  it('works on the drive of the request path', () => {
    expect(askChatCwd({ ...base, path: 'E:\\src\\a.ts' }, windows, home)).toBe('E:\\')
  })

  it('falls back to the drive of the window, then to home', () => {
    expect(askChatCwd({ ...base, windowId: 9 }, windows, home)).toBe('F:\\')
    expect(askChatCwd({ ...base, windowId: 99 }, windows, home)).toBe(home)
    expect(askChatCwd({ ...base, path: 'C:\\Users\\Agent\\x' }, windows, home)).toBe(home)
  })
})

describe('askChatDraft', () => {
  it('is what the composer gets for Ask the agent about this...: the subject and the selection, then room for the question', () => {
    const draft = askChatDraft({ ...base, kind: 'ask', path: 'E:\\src\\a.ts', range: { startLine: 3, endLine: 5 }, text: 'const x = 1' })
    expect(draft).toBe('I have a question about a selection from E:\\src\\a.ts (lines 3-5).\n\n```ts\nconst x = 1\n```\n\n')
    expect(draft).not.toContain('My question follows')
  })

  it('puts a ready question after the subject', () => {
    expect(askChatDraft({ app: 'browser', windowId: 2, kind: 'ask', url: 'https://example.com/', title: 'Example', question: 'What does this page say?' })).toBe('I have a question about the page "Example" at https://example.com/.\n\nWhat does this page say?')
  })

  it('names the page when there is no selection', () => {
    expect(askChatDraft({ app: 'browser', windowId: 2, kind: 'ask', url: 'https://example.com/', title: 'Example' })).toBe('I have a question about the page "Example" at https://example.com/.\n\n')
  })
})
