import { describe, expect, it } from 'vitest'
import { nudgeUp, placePopup, positionPopup } from './popup'

const rect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect

const viewport = { width: 1000, height: 800 }

describe('placePopup', () => {
  it('hangs below the anchor when there is room', () => {
    expect(placePopup(rect(100, 100, 80, 22), { width: 200, height: 150 }, viewport)).toEqual({ left: 100, top: 121 })
  })

  it('flips above the anchor when it would run off the bottom', () => {
    // The chat Mode button sits just above the taskbar.
    const anchor = rect(900, 740, 90, 22)
    expect(placePopup(anchor, { width: 300, height: 120 }, viewport)).toEqual({ left: 700, top: 621 })
  })

  it('stays below when there is more room below than above, clamped to the bottom edge', () => {
    expect(placePopup(rect(10, 60, 80, 22), { width: 100, height: 900 }, viewport).top).toBe(0)
    expect(placePopup(rect(10, 300, 80, 22), { width: 100, height: 600 }, viewport).top).toBe(200)
  })

  it('never goes past the left or top edge', () => {
    expect(placePopup(rect(-20, 10, 40, 20), { width: 50, height: 700 }, viewport)).toEqual({ left: 0, top: 29 })
  })
})

describe('nudgeUp', () => {
  it('leaves a submenu alone when it fits', () => {
    expect(nudgeUp({ top: 100, bottom: 300 }, 800)).toBe(0)
  })

  it('pulls a submenu up by its overflow, but not past the top', () => {
    expect(nudgeUp({ top: 700, bottom: 900 }, 800)).toBe(-100)
    expect(nudgeUp({ top: 50, bottom: 1000 }, 800)).toBe(-50)
  })
})

describe('positionPopup', () => {
  it('flips a combo box list above when cramped below', () => {
    expect(positionPopup(rect(0, 700, 100, 20), 200, 800).top).toBe(501)
  })
})
