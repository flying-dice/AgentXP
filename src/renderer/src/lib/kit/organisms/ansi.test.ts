import { describe, expect, it } from 'vitest'
import { ANSI_PALETTE, parseAnsi } from './ansi'

const ESC = '\u001b'

describe('parseAnsi', () => {
  it('returns one plain span without escapes', () => {
    expect(parseAnsi('hello')).toEqual([{ text: 'hello' }])
    expect(parseAnsi('')).toEqual([])
  })

  it('applies foreground colours and reset', () => {
    expect(parseAnsi(`a${ESC}[31mred${ESC}[0mb`)).toEqual([
      { text: 'a' },
      { text: 'red', fg: ANSI_PALETTE[1] },
      { text: 'b' }
    ])
  })

  it('supports bright colours, backgrounds and 39/49 resets', () => {
    expect(parseAnsi(`${ESC}[92;44mx${ESC}[39;49my`)).toEqual([
      { text: 'x', fg: ANSI_PALETTE[10], bg: ANSI_PALETTE[4] },
      { text: 'y' }
    ])
  })

  it('brightens a normal colour when bold', () => {
    expect(parseAnsi(`${ESC}[1;32mok`)).toEqual([{ text: 'ok', fg: ANSI_PALETTE[10], bold: true }])
  })

  it('treats ESC[m as a reset and merges equal neighbours', () => {
    expect(parseAnsi(`${ESC}[33mA${ESC}[33mB${ESC}[mC`)).toEqual([
      { text: 'AB', fg: ANSI_PALETTE[3] },
      { text: 'C' }
    ])
  })

  it('maps 256-colour indexes below 16 and ignores the rest', () => {
    expect(parseAnsi(`${ESC}[38;5;9mx`)[0].fg).toBe(ANSI_PALETTE[9])
    expect(parseAnsi(`${ESC}[38;5;200mx`)[0]).toEqual({ text: 'x' })
    expect(parseAnsi(`${ESC}[38;2;1;2;3mx`)[0]).toEqual({ text: 'x' })
  })

  it('swaps colours for inverse', () => {
    expect(parseAnsi(`${ESC}[7mx`)[0]).toMatchObject({ fg: ANSI_PALETTE[0], bg: ANSI_PALETTE[7] })
  })

  it('drops non-SGR sequences', () => {
    expect(parseAnsi(`a${ESC}[2Kb${ESC}[1;1Hc${ESC}]0;title\u0007d`)).toEqual([{ text: 'abcd' }])
  })
})
