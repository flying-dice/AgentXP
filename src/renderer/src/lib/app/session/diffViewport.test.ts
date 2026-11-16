import { describe, expect, it } from 'vitest'
import { DIFF_ROW_PX, diffViewportPx, isLongChange, previewIsTight, wholeChangePx } from './diffViewport'

describe('diffViewportPx', () => {
  it('gives a short change 9 rows (UX-177)', () => {
    expect(diffViewportPx(1)).toBe(9 * DIFF_ROW_PX)
    expect(diffViewportPx(5)).toBe(9 * DIFF_ROW_PX)
  })
  it('follows the change between 9 and 14 rows, without a cut row', () => {
    expect(diffViewportPx(10)).toBe(11 * DIFF_ROW_PX)
    expect(diffViewportPx(13)).toBe(14 * DIFF_ROW_PX)
  })
  it('stops at 14 rows and scrolls, with the next row half cut as the hint', () => {
    expect(diffViewportPx(60)).toBe(14.5 * DIFF_ROW_PX)
  })
})

describe('wholeChangePx', () => {
  it('shows every row up to the limit', () => {
    expect(wholeChangePx(15)).toBe(16 * DIFF_ROW_PX)
    expect(wholeChangePx(500)).toBe(400)
  })
})

describe('previewIsTight', () => {
  it('is true when fewer than 9 rows fit', () => {
    expect(previewIsTight(60, 5)).toBe(true)
    expect(previewIsTight(180, 20)).toBe(false)
    expect(previewIsTight(170, 20)).toBe(true)
    expect(previewIsTight(120, 5)).toBe(false)
  })
  it('compares with the change when it is shorter than 8 rows', () => {
    expect(previewIsTight(40, 1)).toBe(false)
    expect(previewIsTight(20, 1)).toBe(true)
  })
})

describe('isLongChange', () => {
  it('is true above 14 rows', () => {
    expect(isLongChange(13)).toBe(false)
    expect(isLongChange(14)).toBe(true)
  })
})
