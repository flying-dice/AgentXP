import { describe, expect, it } from 'vitest'
import { back, forward, locate, markWords, parseTopics, plainText, queryWords, searchHits, searchTopics, slugOf, startHistory, titleOf, topicForApp, topicOfHref, visit } from './helpModel'

const files = {
  '/manuals/paint.md': '# Using Agent Paint\n\nDraw with the **Pencil**.',
  '/manuals/notepad.md': '# Using Notepad\n\nSave a text file with Ctrl+S.',
  '/manuals/index.md': '# Agent7 Help and Support\n\nPress F1.',
  '/manuals/desktop.md': '# Using the Desktop\n\nThe taskbar.',
  '/manuals/zzz.md': 'No heading here'
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

describe('search that finds the answer (UX-44)', () => {
  const topics = parseTopics({
    '/manuals/index.md': '# Agent7 Help and Support\n\nHome.',
    '/manuals/agent-does-not-start.md': '# The agent does not start\n\n## Troubleshooting\n\nIf the chat gives no answer, the page stays blank. Click **Restart**.',
    '/manuals/notepad.md': '# Using Notepad\n\n## 3 - The Window\n\nThe page has a menu bar.'
  })

  it('leaves out stop words', () => {
    expect(queryWords('Page stays blank')).toEqual(['page', 'blank'])
    expect(queryWords('no answer')).toEqual(['answer'])
    expect(queryWords('the')).toEqual(['the'])
  })

  it('finds the troubleshooting topic for "no answer" and "page stays blank"', () => {
    expect(searchTopics(topics, 'no answer').map((t) => t.id)).toEqual(['agent-does-not-start'])
    expect(searchTopics(topics, 'page stays blank').map((t) => t.id)).toEqual(['agent-does-not-start'])
  })

  it('falls back to topics with half of the words, never to nothing-matching ones', () => {
    expect(searchTopics(topics, 'blank unicorn').map((t) => t.id)).toEqual(['agent-does-not-start'])
    expect(searchTopics(topics, 'unicorn')).toEqual([])
  })

  it('names the section and a snippet around the match', () => {
    const [hit] = searchHits(topics, 'blank')
    expect(hit.topic.id).toBe('agent-does-not-start')
    expect(hit.section).toBe('Troubleshooting')
    expect(hit.sectionId).toBe('troubleshooting')
    expect(hit.snippet).toContain('page stays blank')
  })

  it('locate skips code blocks and falls back to the start of the topic', () => {
    const topic = { id: 'x', title: 'X', body: '# X\n\n```\nsecret\n```\n\nOpen text.' }
    expect(locate(topic, ['secret']).section).toBe('')
    expect(locate(topic, ['secret']).snippet).toContain('Open text')
  })

  it('marks the words in the text and not in tags or character references', () => {
    expect(markWords('<p class="page">A page &amp; amp</p>', ['page', 'amp'])).toBe('<p class="page">A <mark>page</mark> &amp; <mark>amp</mark></p>')
    expect(markWords('<p>x</p>', [])).toBe('<p>x</p>')
  })

  it('makes slugs the way the article ids are made', () => {
    expect(slugOf('3 - The Window')).toBe('3-the-window')
  })
})
