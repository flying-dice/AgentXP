import { describe, expect, it } from 'vitest'
import { emptySearch, groupMatches, lookInItems, matchParts, searchKey } from './codeSearch'

const match = (path: string, line: number, text = 'x', textStart = 0, length = 1) => ({ path, line, column: textStart + 1, length, text, textStart })

describe('codeSearch', () => {
  it('groups matches by file, keeping the order found', () => {
    const groups = groupMatches([match('E:\\src\\a.ts', 1), match('E:\\b.md', 4), match('E:\\src\\a.ts', 9)])
    expect(groups.map((g) => [g.name, g.folder, g.matches.map((m) => m.line)])).toEqual([
      ['a.ts', 'E:\\src', [1, 9]],
      ['b.md', 'E:\\', [4]]
    ])
  })

  it('splits a match line around the match and drops the indent', () => {
    expect(matchParts({ text: '    const greeting = "hello"', textStart: 22, length: 5 })).toEqual({ before: '...ng = "', hit: 'hello', after: '"' })
    expect(matchParts({ text: '  x = needle', textStart: 6, length: 6 })).toEqual({ before: 'x = ', hit: 'needle', after: '' })
    expect(matchParts({ text: 'abc', textStart: 10, length: 2 })).toEqual({ before: 'abc', hit: '', after: '' })
  })

  it('lists the project roots to look in, plus a folder the agent searched', () => {
    const roots = [{ path: 'E:\\', name: 'app' }]
    expect(lookInItems(roots, 'E:\\')).toEqual([{ value: 'E:\\', label: 'app (E:\\)' }])
    expect(lookInItems(roots, 'e:\\')).toHaveLength(1)
    expect(lookInItems(roots, 'E:\\src')).toEqual([
      { value: 'E:\\', label: 'app (E:\\)' },
      { value: 'E:\\src', label: 'E:\\src' }
    ])
  })

  it('makes empty searches and keys', () => {
    expect(emptySearch('E:\\')).toEqual({ query: '', root: 'E:\\', regex: false, matchCase: false, include: '' })
    expect(searchKey(undefined)).toBe(searchKey(null))
    expect(searchKey(emptySearch('E:\\'))).not.toBe(searchKey(null))
  })
})
