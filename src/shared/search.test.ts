import { describe, expect, it } from 'vitest'
import { InvalidSearchError, MAX_MATCH_TEXT, clipMatchLine, includeMatcher, lineMatcher, nameMatcher, textSearchSummary } from './search'

describe('nameMatcher and includeMatcher', () => {
  it('matches a name fragment or a glob, ignoring case', () => {
    expect(nameMatcher('*.ts')('a.ts')).toBe(true)
    expect(nameMatcher('*.ts')('a.tsx')).toBe(false)
    expect(nameMatcher('READ')('readme.md')).toBe(true)
  })

  it('takes a comma-separated list, and an empty list lets everything through', () => {
    const only = includeMatcher('*.ts, *.svelte')
    expect(only('a.ts')).toBe(true)
    expect(only('App.svelte')).toBe(true)
    expect(only('a.md')).toBe(false)
    expect(includeMatcher('')('anything')).toBe(true)
    expect(includeMatcher(' , ')('anything')).toBe(true)
  })
})

describe('lineMatcher', () => {
  it('finds plain text, ignoring case unless matchCase', () => {
    expect(lineMatcher({ query: 'foo' })('a FOO b')).toEqual({ start: 2, length: 3 })
    expect(lineMatcher({ query: 'foo', matchCase: true })('a FOO b')).toBeNull()
    expect(lineMatcher({ query: 'a.b' })('axb')).toBeNull() // plain text: the dot is a dot
  })

  it('finds a regular expression and reports the first match', () => {
    expect(lineMatcher({ query: 'b+', regex: true })('abbbc bb')).toEqual({ start: 1, length: 3 })
    expect(lineMatcher({ query: 'x*', regex: true })('abc')).toBeNull() // empty matches do not count
  })

  it('refuses an empty query and a broken regular expression', () => {
    expect(() => lineMatcher({ query: '' })).toThrow(InvalidSearchError)
    expect(() => lineMatcher({ query: '(', regex: true })).toThrow(/Not a valid regular expression/)
  })
})

describe('clipMatchLine and textSearchSummary', () => {
  it('keeps short lines and cuts long ones around the match', () => {
    expect(clipMatchLine('short', 1, 2)).toEqual({ text: 'short', start: 1 })
    const line = `${'a'.repeat(500)}NEEDLE${'b'.repeat(500)}`
    const clipped = clipMatchLine(line, 500, 6)
    expect(clipped.text).toHaveLength(MAX_MATCH_TEXT)
    expect(clipped.text.slice(clipped.start, clipped.start + 6)).toBe('NEEDLE')
  })

  it('summarises a search', () => {
    expect(textSearchSummary({ matches: [], filesMatched: 0, truncated: false })).toBe('No results.')
    const one = { path: 'E:\\a', line: 1, column: 1, length: 1, text: 'a', textStart: 0 }
    expect(textSearchSummary({ matches: [one], filesMatched: 1, truncated: false })).toBe('1 result in 1 file')
    expect(textSearchSummary({ matches: [one, one], filesMatched: 2, truncated: true })).toBe('2+ results in 2 files (more not shown: narrow the search)')
  })
})
