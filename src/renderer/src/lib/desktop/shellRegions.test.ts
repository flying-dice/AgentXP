import { describe, expect, it } from 'vitest'
import { nextRegion, REGIONS } from './shellRegions'

describe('nextRegion', () => {
  it('goes icons, window, bar, taskbar, tray and around', () => {
    expect(REGIONS).toEqual(['icons', 'window', 'bar', 'taskbar', 'tray'])
    const all = [...REGIONS]
    expect(nextRegion(all, 'icons', 1)).toBe('window')
    expect(nextRegion(all, 'tray', 1)).toBe('icons')
    expect(nextRegion(all, 'icons', -1)).toBe('tray')
    expect(nextRegion(all, 'taskbar', -1)).toBe('bar')
  })

  it('skips regions that are not there', () => {
    expect(nextRegion(['icons', 'taskbar'], 'icons', 1)).toBe('taskbar')
    expect(nextRegion(['icons', 'taskbar'], 'taskbar', 1)).toBe('icons')
  })

  it('starts at the first (or last) region when focus is outside every region', () => {
    expect(nextRegion(['window', 'taskbar'], null, 1)).toBe('window')
    expect(nextRegion(['window', 'taskbar'], null, -1)).toBe('taskbar')
  })

  it('has nowhere to go without regions', () => {
    expect(nextRegion([], 'icons', 1)).toBeNull()
  })
})
