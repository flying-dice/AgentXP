import { describe, expect, it, vi } from 'vitest'
import { backgroundItems, defaultOpener, entryItems, propertiesText, type EntryActions } from './explorerContext'

const actions = (): EntryActions => ({ open: vi.fn(), openWith: vi.fn(), copyPath: vi.fn(), properties: vi.fn(), startChat: vi.fn(), askChat: vi.fn() })
const ids = (items: { testid?: string }[]): (string | undefined)[] => items.filter((i) => i.testid).map((i) => i.testid)

describe('entryItems', () => {
  it('a file offers Open, Open with Code and Notepad, Copy path, Start chat, Ask chat and Properties', () => {
    const items = entryItems({ path: 'E:\\a.ts', kind: 'file' }, actions())
    expect(ids(items)).toEqual(['explorer-ctx-open', 'explorer-ctx-open-code', 'explorer-ctx-open-notepad', 'explorer-ctx-copy-path', 'explorer-ctx-start-chat', 'explorer-ctx-ask', 'explorer-ctx-properties'])
  })

  it('a folder has no Open with', () => {
    expect(ids(entryItems({ path: 'E:\\src', kind: 'directory' }, actions()))).not.toContain('explorer-ctx-open-code')
  })

  it('runs the matching action', () => {
    const a = actions()
    const items = entryItems({ path: 'E:\\a.ts', kind: 'file' }, a)
    items.find((i) => i.testid === 'explorer-ctx-open-notepad')?.action?.()
    items.find((i) => i.testid === 'explorer-ctx-copy-path')?.action?.()
    expect(a.openWith).toHaveBeenCalledWith('notepad')
    expect(a.copyPath).toHaveBeenCalled()
  })
})

describe('backgroundItems', () => {
  const noop = () => {}
  it('lists Refresh, Up, Start chat and Ask chat', () => {
    expect(ids(backgroundItems({ refresh: noop, up: noop, inFolder: true, startChat: noop, askChat: noop }))).toEqual(['explorer-ctx-refresh', 'explorer-ctx-up', 'explorer-ctx-start-chat', 'explorer-ctx-ask'])
  })

  it('disables Up and the chat items on Computer', () => {
    const items = backgroundItems({ refresh: noop, up: noop, inFolder: false, startChat: noop, askChat: noop })
    expect(items.filter((i) => i.disabled).length).toBe(3)
  })
})

describe('propertiesText and defaultOpener', () => {
  it('names type, location and size of a file', () => {
    const text = propertiesText({ name: 'a.ts', path: 'E:\\a.ts', kind: 'file', size: 1234, modifiedAt: null }, 'TypeScript file')
    expect(text).toContain('Type: TypeScript file')
    expect(text).toContain('Location: E:\\a.ts')
    expect(text).toContain('Size: 1,234 bytes')
  })

  it('opens text in Notepad and code in Code', () => {
    expect(defaultOpener('E:\\a.md')).toBe('notepad')
    expect(defaultOpener('E:\\a.ts')).toBe('code')
  })
})
