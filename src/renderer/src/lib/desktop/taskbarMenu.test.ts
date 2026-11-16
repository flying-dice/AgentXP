import { describe, expect, it, vi } from 'vitest'
import { taskbarMenuItems } from './taskbarMenu'

describe('taskbarMenuItems', () => {
  const actions = () => ({ restore: vi.fn(), minimize: vi.fn(), close: vi.fn() })

  it('offers Restore only for a minimized or maximized window, Minimize only for a visible one', () => {
    const disabled = (state: 'normal' | 'minimized' | 'maximized') => taskbarMenuItems(state, actions()).filter((i) => i.disabled).map((i) => i.testid)
    expect(disabled('normal')).toEqual(['taskbar-ctx-restore'])
    expect(disabled('minimized')).toEqual(['taskbar-ctx-minimize'])
    expect(disabled('maximized')).toEqual([])
  })

  it('Close window runs the close action', () => {
    const a = actions()
    taskbarMenuItems('normal', a).find((i) => i.testid === 'taskbar-ctx-close')?.action?.()
    expect(a.close).toHaveBeenCalledOnce()
  })
})
