import { describe, expect, it } from 'vitest'
import { back, forward, indexSections, markWords, parseTopics, plainText, queryWords, searchSections, sectionsOf, slugOf, snippetOf, startHistory, titleOf, topicForApp, topicOfHref, visit, splitTopic, sectionOfHref, resolveSection, controlRowsOf, controlSection, CONTROL_PREFIX } from './helpModel'

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

describe('searchSections', () => {
  const topics = parseTopics(files)
  const ids = (query: string, preferred?: string): string[] => searchSections(topics, query, preferred).map((h) => h.topic.id)
  it('gives nothing for an empty query', () => {
    expect(searchSections(topics, '  ')).toEqual([])
  })
  it('matches every word in the title or the text, ignoring case', () => {
    expect(ids('SAVE text')).toEqual(['notepad'])
    expect(ids('pencil')).toEqual(['paint'])
  })
  it('puts title matches first', () => {
    expect(ids('using')).toEqual(['desktop', 'notepad', 'paint'])
    expect(ids('f1 help')).toEqual(['index'])
  })
  it('returns nothing when no section matches', () => {
    expect(searchSections(topics, 'unicorn')).toEqual([])
  })
})

describe('topicForApp and topicOfHref', () => {
  it('uses the app kind, without a section, as the topic, and the keyboard topic without a window (UX-148)', () => {
    expect(topicForApp('notepad')).toBe('notepad')
    expect(topicForApp('code-review')).toBe('code-review')
    expect(splitTopic(topicForApp('notepad'))).toEqual({ topic: 'notepad', section: '' })
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

  const topicIds = (query: string): string[] => [...new Set(searchSections(topics, query).map((h) => h.topic.id))]

  it('finds the troubleshooting topic for "no answer" and "page stays blank"', () => {
    expect(topicIds('no answer')).toEqual(['agent-does-not-start'])
    expect(topicIds('page stays blank')).toEqual(['agent-does-not-start'])
  })

  it('falls back to sections with half of the words, never to nothing-matching ones', () => {
    expect(topicIds('blank unicorn')).toEqual(['agent-does-not-start'])
    expect(topicIds('unicorn')).toEqual([])
  })

  it('names the section and a snippet around the match', () => {
    const [hit] = searchSections(topics, 'blank')
    expect(hit.topic.id).toBe('agent-does-not-start')
    expect(hit.section).toBe('Troubleshooting')
    expect(hit.sectionId).toBe('troubleshooting')
    expect(hit.snippet).toContain('page stays blank')
  })

  it('cuts a topic into sections, skips code blocks and the table of contents', () => {
    const topic = { id: 'x', title: 'X', body: '# X\n\nIntro words.\n\n## Table of Contents\n\n- A\n\n## A - Part\n\n```\nsecret\n```\n\nOpen text.\n\n### Deep\n\nDeeper text.' }
    expect(sectionsOf(topic).map((s) => [s.section, s.text])).toEqual([
      ['', 'Intro words.'],
      ['A - Part', 'Open text.'],
      ['Deep', 'Deeper text.']
    ])
    expect(searchSections([topic], 'secret')).toEqual([])
  })

  it('shows the start of the section when only its heading matches', () => {
    expect(snippetOf('Plain start of the section.', ['nothing'])).toBe('Plain start of the section.')
    expect(snippetOf('a'.repeat(300), ['a']).length).toBeLessThan(300)
  })

  it('marks the words in the text and not in tags or character references', () => {
    expect(markWords('<p class="page">A page &amp; amp</p>', ['page', 'amp'])).toBe('<p class="page">A <mark>page</mark> &amp; <mark>amp</mark></p>')
    expect(markWords('<p>x</p>', [])).toBe('<p>x</p>')
  })

  it('makes slugs the way the article ids are made', () => {
    expect(slugOf('3 - The Window')).toBe('3-the-window')
  })
})

describe('sections and ranking (UX-80, UX-81)', () => {
  const topics = parseTopics({ ...files, '/manuals/chat.md': '# Using Chat\n\nSave your work.', '/manuals/code.md': '# Using Code\n\nSave nothing.' })

  it('splits a topic with a section and reads the section of a link', () => {
    expect(splitTopic('browser#troubleshooting')).toEqual({ topic: 'browser', section: 'troubleshooting' })
    expect(splitTopic('browser')).toEqual({ topic: 'browser', section: '' })
    expect(sectionOfHref('notepad.md#saving-a-file')).toBe('saving-a-file')
    expect(sectionOfHref('notepad.md')).toBe('')
  })

  it('finds the numbered heading for a plain section name', () => {
    expect(resolveSection(['1-what-it-is-for', '6-troubleshooting'], 'troubleshooting')).toBe('6-troubleshooting')
    expect(resolveSection(['6-troubleshooting'], '6-troubleshooting')).toBe('6-troubleshooting')
    expect(resolveSection(['a'], 'b')).toBeNull()
  })

  it('puts the topic of the focused app first', () => {
    expect(searchSections(topics, 'save').map((h) => h.topic.id)).toEqual(['chat', 'notepad', 'code'])
    expect(searchSections(topics, 'save', 'code')[0].topic.id).toBe('code')
    expect(searchSections(topics, 'save', 'chat')[0].topic.id).toBe('chat')
  })
})

describe('section search (UX-110)', () => {
  const topics = parseTopics({
    '/manuals/chat.md': '# Using Chat\n\nYou can stop the agent, undo its file changes, and answer its requests.\n\n## 3 - The Window\n\nThe transcript.\n\n### Undo a change (Revert)\n\nClick **Revert**. The file goes back to its old text.\n\n## 5 - Common Tasks\n\nTo stop the agent, click **Stop**.',
    '/manuals/notepad.md': '# Using Notepad\n\n## 5 - Common Tasks\n\nTo undo the last edit press Ctrl+Z. Save with Ctrl+S.',
    '/manuals/code.md': '# Using Code\n\n## Revert a hunk\n\nThe lines go back to the last commit.'
  })

  it('finds the Revert section first for "undo", before the text that only mentions it', () => {
    const [first, ...rest] = searchSections(topics, 'undo')
    expect(first.topic.id).toBe('chat')
    expect(first.section).toBe('Undo a change (Revert)')
    expect(first.sectionId).toBe('undo-a-change-revert')
    expect(rest.map((h) => `${h.topic.id}:${h.section}`)).toEqual(['chat:', 'notepad:5 - Common Tasks'])
  })

  it('ranks a heading match above a body match whatever the topic order', () => {
    const [first] = searchSections(topics, 'revert')
    expect(first.section).toBe('Undo a change (Revert)')
    expect(searchSections(topics, 'revert').map((h) => h.section)).toEqual(['Undo a change (Revert)', 'Revert a hunk'])
  })

  it('lists the topic of the focused app first among equals', () => {
    expect(searchSections(topics, 'stop', 'chat')[0].topic.id).toBe('chat')
    expect(searchSections(topics, 'ctrl', 'notepad')[0].topic.id).toBe('notepad')
  })

  it('indexes the sections once per list of topics', () => {
    expect(indexSections(topics)).toBe(indexSections(topics))
    expect(indexSections(topics).map((s) => s.sectionId)).toContain('3-the-window')
  })
})

describe('F1 on a control (UX-205)', () => {
  const body = '| Name | What it does | data-testid |\n|---|---|---|\n| Save | Saves. | `notepad-save` |\n| Icon | Opens an app. | `desktop-icon-*` |\n| Ctrl+S | Saves. | none |\n'
  it('lists the rows of the tables that have a test id, by name', () => {
    expect(controlRowsOf(body)).toEqual([
      { name: 'Save', id: 'notepad-save' },
      { name: 'Icon', id: 'desktop-icon-*' }
    ])
  })
  it('finds the row of the innermost control that the manual lists', () => {
    expect(controlSection(body, ['notepad-save'])).toBe(`${CONTROL_PREFIX}Save`)
    expect(controlSection(body, ['unknown', 'desktop-icon-computer'])).toBe(`${CONTROL_PREFIX}Icon`)
  })
  it('gives null when the manual lists none of them', () => {
    expect(controlSection(body, ['unknown', 'window-notepad'])).toBeNull()
    expect(controlSection(body, [])).toBeNull()
  })
})
