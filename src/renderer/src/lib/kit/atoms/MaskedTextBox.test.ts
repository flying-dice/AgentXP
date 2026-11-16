import { describe, expect, it } from 'vitest'
import { caretForRawCount, deleteRaw, formatMask, parseMask, unmask } from './MaskedTextBox'

describe('parseMask', () => {
  it('maps mask characters to slots and the rest to literals', () => {
    expect(parseMask('0-L')).toEqual([{ kind: 'digit' }, { literal: '-' }, { kind: 'letter' }])
  })
  it('treats a backslash-escaped mask character as literal', () => {
    expect(parseMask('\\0')).toEqual([{ literal: '0' }])
  })
})

describe('formatMask', () => {
  it('formats a phone number with literals and prompts', () => {
    expect(formatMask('(000) 000-0000', '555123').text).toBe('(555) 123-____')
  })
  it('reports completeness', () => {
    expect(formatMask('00/00', '1234').complete).toBe(true)
    expect(formatMask('00/00', '123').complete).toBe(false)
  })
  it('drops characters that do not fit the slot', () => {
    const r = formatMask('00-LL', 'a1b2cd')
    expect(r.raw).toBe('12cd')
    expect(r.text).toBe('12-cd')
  })
  it('does not require optional digits', () => {
    const r = formatMask('999-00', '12')
    expect(r.complete).toBe(false)
    expect(formatMask('999-00', '12345').complete).toBe(true)
    expect(formatMask('09', '5').complete).toBe(true)
    expect(formatMask('09', '5').text).toBe('5_')
  })
  it('accepts letters or digits for A', () => {
    expect(formatMask('AAA', 'a1-').text).toBe('a1_')
  })
  it('uses a custom prompt', () => {
    expect(formatMask('00', '', ' ').text).toBe('  ')
  })
})

describe('unmask', () => {
  it('strips literals and prompts', () => {
    expect(unmask('(000) 000', '(55_) ___')).toBe('55')
  })
  it('round-trips formatted text', () => {
    const t = formatMask('00/00/0000', '01022024').text
    expect(formatMask('00/00/0000', unmask('00/00/0000', t)).text).toBe(t)
  })
})

describe('caretForRawCount', () => {
  it('skips literals to the next editable slot', () => {
    expect(caretForRawCount('00-00', 0)).toBe(0)
    expect(caretForRawCount('00-00', 2)).toBe(3)
    expect(caretForRawCount('00-00', 4)).toBe(5)
  })
})

describe('deleteRaw', () => {
  it('backspace removes the previous char', () => {
    expect(deleteRaw('1234', 3, 3, 'backward')).toEqual({ raw: '124', rawCaret: 2 })
  })
  it('delete removes the next char', () => {
    expect(deleteRaw('1234', 1, 1, 'forward')).toEqual({ raw: '134', rawCaret: 1 })
  })
  it('removes a selection', () => {
    expect(deleteRaw('1234', 1, 3, 'backward')).toEqual({ raw: '14', rawCaret: 1 })
  })
  it('backspace at start is a no-op', () => {
    expect(deleteRaw('12', 0, 0, 'backward').raw).toBe('12')
  })
})
