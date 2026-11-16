import { describe, expect, it } from 'vitest'
import { back, forward, parseTopics, plainText, searchTopics, startHistory, titleOf, topicForApp, topicOfHref, visit } from './helpModel'

const files = {
  '/docs/help/paint.md': '# Using Agent Paint\n\nDraw with the **Pencil**.',
  '/docs/help/notepad.md': '# Using Notepad\n\nSave a text file with Ctrl+S.',
  '/docs/help/index.md': '# Agent7 Help and Support\n\nPress F1.',
  '/docs/help/desktop.md': '# Using the Desktop\n\nThe taskbar.',
  '/docs/help/zzz.md': 'No heading here'
}

describe('parseTopics', () => {
  it('takes the id from the file name and the title from the first heading', () => {
    const topics = parseTopics(files)
    expect(topics.find((t) => t.id === 'notepad')?.title).toBe('Using Notepad')
    expect(topics.find((t) => t.id === 'zzz')?.title).toBe('zzz')
  })

  it('orders Home, Desktop, then apps, then the rest', () => {
    expect(parseTopics(files).map((t) => t.id)).toEqual(['index', 'desktop', 'notepad', 'paint', 'zzz'])
  })
})

describe('titleOf and plainText', () => {
  it('finds the first level one heading', () => {
    expect(titleOf('text\n# Title #\n## Other', 'x')).toBe('Title')
  })
  it('removes marks, code blocks and link targets', () => {
    expect(plainText('A **bold** [link](notepad.md) `x`\n```\nhidden\n```')).toBe('A bold link x')
  })
})

describe('searchTopics', () => {
  const topics = parseTopics(files)
  it('keeps all topics for an empty query', () => {
    expect(searchTopics(topics, '  ')).toHaveLength(topics.length)
  })
  it('matches every word in the title or the text, ignoring case', () => {
    expect(searchTopics(topics, 'SAVE text').map((t) => t.id)).toEqual(['notepad'])
    expect(searchTopics(topics, 'pencil').map((t) => t.id)).toEqual(['paint'])
  })
  it('puts title matches first', () => {
    expect(searchTopics(topics, 'using').map((t) => t.id)).toEqual(['desktop', 'notepad', 'paint'])
    expect(searchTopics(topics, 'f1 help').map((t) => t.id)).toEqual(['index'])
  })
  it('returns nothing when no topic matches', () => {
    expect(searchTopics(topics, 'unicorn')).toEqual([])
  })
})

describe('topicForApp and topicOfHref', () => {
  it('uses the app kind as the topic and the desktop topic without a window', () => {
    expect(topicForApp('notepad')).toBe('notepad')
    expect(topicForApp(null)).toBe('desktop')
    expect(topicForApp(undefined)).toBe('desktop')
  })
  it('accepts links to other manuals only', () => {
    expect(topicOfHref('notepad.md')).toBe('notepad')
    expect(topicOfHref('./Code.md#the-window')).toBe('code')
    expect(topicOfHref('https://example.com/a.md')).toBeNull()
    expect(topicOfHref('javascript:alert(1)')).toBeNull()
    expect(topicOfHref('#top')).toBeNull()
    expect(topicOfHref('../secret.md')).toBeNull()
  })
})

describe('history', () => {
  it('goes back and forward and clears Forward on a new visit', () => {
    let h = startHistory('index')
    h = visit(visit(h, 'chat'), 'notepad')
    expect(h.current).toBe('notepad')
    h = back(back(h))
    expect(h.current).toBe('index')
    expect(back(h)).toBe(h)
    h = forward(h)
    expect(h.current).toBe('chat')
    h = visit(h, 'code')
    expect(h.future).toEqual([])
    expect(forward(h)).toBe(h)
  })
  it('ignores a visit to the current topic', () => {
    const h = startHistory('index')
    expect(visit(h, 'index')).toBe(h)
  })
})
