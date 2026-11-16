import { describe, expect, it } from 'vitest'
import type { AppKind, AppWindowState, WindowState } from '@shared/desktop'
import { cycleTarget, nextFocus, raise, taskbarAction, taskbarItems, visibleWindows } from './windowOrder'

const win = (id: number, app: AppKind = 'explorer', windowState: WindowState = 'normal'): AppWindowState => ({
  id,
  app,
  title: `Window ${id}`,
  bounds: { x: 0, y: 0, width: 300, height: 200 },
  windowState,
  openedBy: 'user',
  view: { app: 'agent-manager' }
})

describe('z-order', () => {
  it('raises a window to the end', () => {
    expect(raise([win(1), win(2), win(3)], 1).map((w) => w.id)).toEqual([2, 3, 1])
    expect(raise([win(1), win(2)], 99).map((w) => w.id)).toEqual([1, 2])
  })
  it('focuses the topmost visible window after one closes or minimises', () => {
    const ws = [win(1), win(2, 'explorer', 'minimized'), win(3)]
    expect(nextFocus(ws, 3)).toBe(1)
    expect(nextFocus([win(1, 'explorer', 'minimized')])).toBeNull()
    expect(nextFocus([])).toBeNull()
  })
  it('hides minimised windows', () => {
    expect(visibleWindows([win(1), win(2, 'explorer', 'minimized')]).map((w) => w.id)).toEqual([1])
  })
})

describe('taskbar', () => {
  it('flashes the button of a window that wants attention until it has focus', () => {
    const flagged = { ...win(2), attention: true }
    expect(taskbarItems([win(1), flagged], 1, {}).find((i) => i.id === '2')?.flashing).toBe(true)
    expect(taskbarItems([win(1), flagged], 2, {}).find((i) => i.id === '2')?.flashing).toBe(false)
    expect(taskbarItems([win(1), win(2)], 1, {}).every((i) => !i.flashing)).toBe(true)
  })

  it('toggles on click', () => {
    expect(taskbarAction(win(1), 1)).toBe('minimize')
    expect(taskbarAction(win(1), 2)).toBe('focus')
    expect(taskbarAction(win(1, 'explorer', 'minimized'), 1)).toBe('restore')
  })
  it('lists one button per window in opening order with the focused one active', () => {
    const items = taskbarItems([win(3), win(1), win(2, 'terminal', 'minimized')], 3, { terminal: 'terminal', explorer: 'folder' })
    expect(items.map((i) => i.id)).toEqual(['1', '2', '3'])
    expect(items.find((i) => i.id === '3')?.active).toBe(true)
    expect(items.find((i) => i.id === '2')).toMatchObject({ icon: 'terminal', running: true, active: false })
  })
  it('a focused but minimised window is not active', () => {
    expect(taskbarItems([win(1, 'explorer', 'minimized')], 1, {})[0].active).toBe(false)
  })
})

describe('cycleTarget (Alt+Tab)', () => {
  const ws = [win(1), win(2, 'explorer', 'minimized'), win(3)]
  it('goes to the next window in recent order, around', () => {
    expect(cycleTarget(ws, 3, 1)).toBe(2)
    expect(cycleTarget(ws, 2, 1)).toBe(1)
    expect(cycleTarget(ws, 1, 1)).toBe(3)
  })
  it('Alt+Shift+Tab goes the other way', () => {
    expect(cycleTarget(ws, 3, -1)).toBe(1)
  })
  it('takes the front window when none has focus, and nothing when there are none', () => {
    expect(cycleTarget(ws, null, 1)).toBe(3)
    expect(cycleTarget([], null, 1)).toBeNull()
  })
})
