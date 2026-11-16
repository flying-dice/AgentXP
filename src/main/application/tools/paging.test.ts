import { describe, expect, it } from 'vitest'
import { MAX_PAGE_LINES, paginate } from './paging'

const lines = Array.from({ length: 10 }, (_, i) => `line ${i}`)

describe('paginate', () => {
  it('returns the first page and where the next one starts', () => {
    expect(paginate(lines, 0, 4)).toEqual({ lines: lines.slice(0, 4), offset: 0, nextOffset: 4, total: 10 })
  })

  it('walks the whole document without gaps or overlaps', () => {
    const seen: string[] = []
    for (let offset: number | null = 0; offset !== null; ) {
      const page = paginate(lines, offset, 3)
      seen.push(...page.lines)
      offset = page.nextOffset
    }
    expect(seen).toEqual(lines)
  })

  it('ends with a null nextOffset and clamps offsets outside the document', () => {
    expect(paginate(lines, 8, 5).nextOffset).toBeNull()
    expect(paginate(lines, 99, 5)).toEqual({ lines: [], offset: 10, nextOffset: null, total: 10 })
    expect(paginate(lines, -5, 2).offset).toBe(0)
  })

  it('stops at the character budget but always returns one line', () => {
    const long = ['a'.repeat(50), 'b'.repeat(50), 'c'.repeat(50)]
    expect(paginate(long, 0, 100, 80).lines).toHaveLength(1)
    expect(paginate(long, 0, 100, 120).lines).toHaveLength(2)
    expect(paginate(['x'.repeat(500)], 0, 10, 100).lines[0]).toHaveLength(103)
  })

  it('caps the line count', () => {
    const many = Array.from({ length: MAX_PAGE_LINES + 50 }, () => 'x')
    expect(paginate(many, 0, 100000).lines).toHaveLength(MAX_PAGE_LINES)
  })
})
