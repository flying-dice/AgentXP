import { describe, expect, it, vi } from 'vitest'
import { buildMenus, type MenuState } from './menus'

const state = (over: Partial<MenuState> = {}): MenuState => ({
  hasSession: true,
  busy: false,
  canUndo: true,
  canCompact: true,
  modes: [{ id: 'ask', name: 'Ask before edits', description: null }, { id: 'plan', name: 'Plan', description: null }],
  currentModeId: 'plan',
  models: [],
  currentModelId: null,
  ...over
})

const find = (menus: ReturnType<typeof buildMenus>, label: string, item: string) =>
  menus.find((m) => m.label === label)?.items.find((i) => i.id === item || i.label === item)

describe('buildMenus', () => {
  it('has the six top level menus', () => {
    expect(buildMenus(state(), { run: vi.fn(), setMode: vi.fn(), setModel: vi.fn() }).map((m) => m.label)).toEqual(['&File', '&Edit', '&View', '&Session', '&Tools', '&Help'])
  })

  it('disables items by application state', () => {
    const menus = buildMenus(state({ canUndo: false, canCompact: false, busy: true }), { run: vi.fn(), setMode: vi.fn(), setModel: vi.fn() })
    expect(find(menus, '&Edit', 'edit.undo')?.disabled).toBe(true)
    expect(find(menus, '&Session', 'session.compact')?.disabled).toBe(true)
    expect(find(menus, '&Session', 'session.stop')?.disabled).toBe(false)
    expect(find(menus, '&Session', 'model')?.disabled).toBe(true)
  })

  it('fills the Mode submenu with radio items and routes picks', () => {
    const setMode = vi.fn()
    const menus = buildMenus(state(), { run: vi.fn(), setMode, setModel: vi.fn() })
    const items = find(menus, '&Session', 'mode')?.items ?? []
    expect(items.map((i) => [i.label, i.checked, i.radio])).toEqual([['Ask before edits', false, true], ['Plan', true, true]])
    items[0].action?.()
    expect(setMode).toHaveBeenCalledWith('ask')
  })

  it('shows the shortcut texts', () => {
    const menus = buildMenus(state(), { run: vi.fn(), setMode: vi.fn(), setModel: vi.fn() })
    expect(find(menus, '&File', 'session.new')?.shortcut).toBe('Ctrl+N')
  })
})
