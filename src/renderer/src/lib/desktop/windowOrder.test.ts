import { describe, expect, it } from 'vitest'
import type { AppKind, AppWindowState, WindowState } from '@shared/desktop'
import { cycleTarget, nextFocus, raise, taskbarAction, taskbarItems, visibleWindows, windowsToMoveBelowBar } from './windowOrder'

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
  it('puts "Waiting: " before the title of a chat that waits for an answer', () => {
    const chat = (id: number, sessionId: number): AppWindowState => ({ ...win(id, 'chat'), view: { app: 'chat', sessionId, title: 'hello' } })
    const items = taskbarItems([chat(1, 10), chat(2, 11), win(3)], 1, {}, new Set([11]))
    expect(items.map((i) => i.title)).toEqual(['Window 1', 'Waiting: Window 2', 'Window 3'])
  })

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
  it('brings a focused window forward when another one covers it, and minimizes only the one on top', () => {
    const windows = [win(1), win(2)] // back to front: 2 is on top
    expect(taskbarAction(windows[0], 1, windows)).toBe('focus')
    expect(taskbarAction(windows[1], 2, windows)).toBe('minimize')
    expect(taskbarAction(windows[0], 2, windows)).toBe('focus')
    expect(taskbarAction(win(1), 1, [win(1), win(2, 'explorer', 'minimized')])).toBe('minimize')
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

describe('windows under the top bar (UX-88)', () => {
  const at = (id: number, x: number, y: number, windowState: WindowState = 'normal'): AppWindowState => ({ ...win(id, 'explorer', windowState), bounds: { x, y, width: 300, height: 200 } })
  for (const height of [52, 68]) {
    it(`moves a window whose title bar is under a bar of ${height} px to ${height + 4}`, () => {
      const bar = { left: 400, right: 900, height }
      const moves = windowsToMoveBelowBar([at(1, 450, 34), at(2, 450, height + 4), at(3, 0, 10), at(4, 450, 10, 'maximized'), at(5, 700, 0)], bar)
      expect(moves.map((m) => [m.id, m.bounds.y])).toEqual([[1, height + 4], [5, height + 4]])
    })
  }
  it('keeps a window that is clear of the bar sideways', () => {
    expect(windowsToMoveBelowBar([at(1, 0, 0)], { left: 400, right: 900, height: 68 })).toEqual([])
  })
})
