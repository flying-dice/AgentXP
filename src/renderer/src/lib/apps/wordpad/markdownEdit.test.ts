import { describe, expect, it } from 'vitest'
import { headingAtLine, insertLink, lineOf, toggleBullets, toggleCode, toggleHeading, toggleNumbers, wrapSelection } from './markdownEdit'

describe('wrapSelection', () => {
  it('wraps a selection and unwraps it again', () => {
    const a = wrapSelection('say hello now', 4, 9, '**')
    expect(a.text).toBe('say **hello** now')
    expect(a.text.slice(a.start, a.end)).toBe('hello')
    const b = wrapSelection(a.text, a.start, a.end, '**')
    expect(b.text).toBe('say hello now')
  })
  it('uses a placeholder for an empty selection', () => {
    const a = wrapSelection('', 0, 0, '_')
    expect(a.text).toBe('_text_')
    expect(a.text.slice(a.start, a.end)).toBe('text')
  })
})

describe('line prefixes', () => {
  it('toggles heading levels', () => {
    expect(toggleHeading('Title', 0, 0, 1).text).toBe('# Title')
    expect(toggleHeading('# Title', 0, 0, 1).text).toBe('Title')
    expect(toggleHeading('# Title', 0, 0, 2).text).toBe('## Title')
  })
  it('bullets and numbers over several lines', () => {
    expect(toggleBullets('a\nb', 0, 3).text).toBe('- a\n- b')
    expect(toggleBullets('- a\n- b', 0, 7).text).toBe('a\nb')
    expect(toggleNumbers('a\nb\nc', 0, 5).text).toBe('1. a\n2. b\n3. c')
    expect(toggleNumbers('- a\n- b', 0, 7).text).toBe('1. a\n2. b')
  })
})

describe('code and link', () => {
  it('inline code for one line, fenced for several', () => {
    expect(toggleCode('run npm test', 4, 12).text).toBe('run `npm test`')
    expect(toggleCode('a\nb', 0, 3).text).toBe('```\na\nb\n```\n')
  })
  it('inserts a link with the url selected', () => {
    const e = insertLink('see docs here', 4, 8)
    expect(e.text).toBe('see [docs](https://) here')
    expect(e.text.slice(e.start, e.end)).toBe('https://')
  })
})

describe('headingAtLine', () => {
  const doc = '# One\ntext\n## Two\n```\n# not a heading\n```\nmore'
  it('finds the heading above a line', () => {
    expect(headingAtLine(doc, 1)).toBe('One')
    expect(headingAtLine(doc, 2)).toBe('One')
    expect(headingAtLine(doc, 7)).toBe('Two')
    expect(headingAtLine('plain', 1)).toBeNull()
  })
  it('counts lines', () => {
    expect(lineOf('a\nb\nc', 4)).toBe(3)
  })
})
