import { describe, expect, it, vi } from 'vitest'
import type { MenuItemDef } from '../../kit/molecules/MenuItem'
import { treeMenu, treeToolbar, type TreeMenuOps } from './codeContext'

const ops = (): TreeMenuOps => ({ open: vi.fn(), startChat: vi.fn(), openInExplorer: vi.fn(), openWithNotepad: vi.fn(), copyPath: vi.fn(), askAboutFile: vi.fn(), eject: vi.fn(), plugIn: vi.fn() })
const labels = (items: MenuItemDef[]): string[] => items.filter((i) => !i.separator).map((i) => i.label ?? '')

describe('treeMenu', () => {
  it('a project has no editor verbs, only project verbs ending with Eject', () => {
    const items = treeMenu('project', ops(), { canEject: true })
    expect(labels(items)).toEqual(['&Open', '&New chat here', 'Open in &Explorer', '&Remove from desktop'])
    expect(items.some((i) => /Cut|Copy|Paste/.test(i.label ?? ''))).toBe(false)
    expect(items.find((i) => i.testid === 'code-ctx-eject')?.title).toContain('Its folder stays on your disk')
  })

  it('Eject is off for the agent home', () => {
    expect(treeMenu('project', ops(), { canEject: false }).find((i) => i.testid === 'code-ctx-eject')?.disabled).toBe(true)
  })

  it('a file offers Open, Open with Notepad, Copy as path and Ask chat', () => {
    expect(labels(treeMenu('file', ops(), { canEject: true }))).toEqual(['&Open', 'Open with &Notepad', 'Copy as &path', '&Ask chat about this file...'])
  })

  it('the empty area plugs in a project', () => {
    const o = ops()
    const [plug] = treeMenu('empty', o, { canEject: true })
    plug.action?.()
    expect(o.plugIn).toHaveBeenCalled()
    expect(plug.label).toBe('&Plug in a project...')
  })

  it('a folder starts a chat on it', () => {
    const o = ops()
    treeMenu('folder', o, { canEject: true }).find((i) => i.testid === 'code-ctx-start-chat')?.action?.()
    expect(o.startChat).toHaveBeenCalled()
  })
})

describe('treeToolbar', () => {
  it('works in the selected project or folder, and in the folder of a selected file', () => {
    expect(treeToolbar({ kind: 'project', path: 'E:\\' }, 'C:\\home', true)).toEqual({ chatFolder: 'E:\\', removable: true })
    expect(treeToolbar({ kind: 'folder', path: 'E:\\src' }, 'C:\\home', true)).toEqual({ chatFolder: 'E:\\src', removable: false })
    expect(treeToolbar({ kind: 'file', path: 'E:\\src\\a.ts' }, 'C:\\home', true)).toEqual({ chatFolder: 'E:\\src', removable: false })
    expect(treeToolbar({ kind: 'file', path: 'E:\\a.ts' }, 'C:\\home', true).chatFolder).toBe('E:\\')
  })

  it('falls back to the first project when nothing is selected, and never removes the agent home', () => {
    expect(treeToolbar(null, 'E:\\', true)).toEqual({ chatFolder: 'E:\\', removable: false })
    expect(treeToolbar({ kind: 'project', path: 'C:\\home' }, 'C:\\home', false).removable).toBe(false)
  })
})
