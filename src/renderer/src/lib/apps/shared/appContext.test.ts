import { describe, expect, it } from 'vitest'
import { selectionContext } from './appContext.svelte'

describe('selectionContext', () => {
  it('is empty without a selection', () => {
    expect(selectionContext('')).toEqual({})
    expect(selectionContext('  \n ')).toEqual({})
  })

  it('gives the text and the line range', () => {
    expect(selectionContext('const x = 1', { startLine: 3, endLine: 5 })).toEqual({ selection: 'const x = 1', range: { startLine: 3, endLine: 5 } })
    expect(selectionContext('word')).toEqual({ selection: 'word' })
  })

  it('cuts a long selection', () => {
    const out = selectionContext('a'.repeat(50), null, 10) as { selection: string }
    expect(out.selection).toBe(`${'a'.repeat(10)}...`)
  })
})
