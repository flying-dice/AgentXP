import { describe, expect, it, vi } from 'vitest'
import { backgroundItems, defaultOpener, otherOpener, OPEN_LABEL, driveItems, driveProperties, entryItems, projectCountText, propertiesText, type EntryActions } from './explorerContext'

const actions = (): EntryActions => ({ open: vi.fn(), openWith: vi.fn(), copyPath: vi.fn(), properties: vi.fn(), startChat: vi.fn(), askChat: vi.fn() })
const ids = (items: { testid?: string }[]): (string | undefined)[] => items.filter((i) => i.testid).map((i) => i.testid)

const sub = (items: { testid?: string; items?: { testid?: string }[] }[]): (string | undefined)[] => items.find((i) => i.testid === 'explorer-ctx-open-with')?.items?.map((i) => i.testid) ?? []

describe('entryItems', () => {
  it('a file offers Open, Open with, Copy path, Start chat, Ask the agent about this and Properties', () => {
    const items = entryItems({ path: 'E:\\a.ts', kind: 'file' }, actions())
    expect(ids(items)).toEqual(['explorer-ctx-open', 'explorer-ctx-open-with', 'explorer-ctx-copy-path', 'explorer-ctx-start-chat', 'explorer-ctx-ask', 'explorer-ctx-properties'])
  })

  it('a folder has no Open with and keeps the ids of its Open and Start a chat here items', () => {
    const items = entryItems({ path: 'E:\\src', kind: 'directory' }, actions())
    expect(ids(items)).not.toContain('explorer-ctx-open-with')
    expect(items.map((i) => i.id)).toEqual(expect.arrayContaining(['explorer-folder-open', 'explorer-folder-chat']))
  })

  it('Open is just Open, and Notepad shows once at most (UX-206)', () => {
    const open = (path: string): unknown => entryItems({ path, kind: 'file' }, actions()).find((i) => i.testid === 'explorer-ctx-open')?.label
    expect(open('E:\\notes.md')).toBe(OPEN_LABEL)
    expect(open('E:\\a.ts')).toBe(OPEN_LABEL)
    // A text file opens in Notepad: Open with offers Code only. A code file opens in Code: Open with offers Notepad only.
    expect(sub(entryItems({ path: 'E:\\notes.md', kind: 'file' }, actions()))).toEqual(['explorer-ctx-open-code'])
    expect(sub(entryItems({ path: 'E:\\a.ts', kind: 'file' }, actions()))).toEqual(['explorer-ctx-open-notepad'])
    expect(otherOpener('E:\\notes.md')).toBe('code')
    expect(otherOpener('E:\\a.ts')).toBe('notepad')
  })

  it('runs the matching action', () => {
    const a = actions()
    const items = entryItems({ path: 'E:\\a.ts', kind: 'file' }, a)
    items.find((i) => i.testid === 'explorer-ctx-open-with')?.items?.[0].action?.()
    items.find((i) => i.testid === 'explorer-ctx-copy-path')?.action?.()
    expect(a.openWith).toHaveBeenCalledWith('notepad')
    expect(a.copyPath).toHaveBeenCalled()
  })
})

describe('backgroundItems', () => {
  const noop = () => {}
  it('lists Refresh, Up, Start chat and Ask the agent about this', () => {
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
    expect(defaultOpener('E:\\flow.xpdiagram')).toBe('diagrams')
    expect(otherOpener('E:\\flow.xpdiagram')).toBe('code')
  })
})

describe('driveItems', () => {
  const noop = () => {}
  const actions = { open: noop, startChat: noop, askChat: noop, copyPath: noop, eject: noop, properties: noop }

  it('a project drive offers Open, Start a chat here, Eject and Properties', () => {
    const items = driveItems({ kind: 'removable' }, actions)
    expect(items.map((i) => i.id)).toEqual(expect.arrayContaining(['explorer-drive-open', 'explorer-drive-chat', 'explorer-drive-eject', 'explorer-ctx-drive-properties']))
    expect(items.find((i) => i.id === 'explorer-drive-eject')?.label).toBe('&Eject (remove from this desktop)')
    expect(items.find((i) => i.id === 'explorer-drive-eject')?.disabled).toBe(false)
  })

  it('the system disk cannot be ejected', () => {
    expect(driveItems({ kind: 'system' }, actions).find((i) => i.id === 'explorer-drive-eject')?.disabled).toBe(true)
  })

  it('describes a project drive and counts projects', () => {
    const text = driveProperties({ label: 'login-app', letter: 'E', kind: 'removable', pluggedAt: null })
    expect(text).toContain('login-app (E:)')
    expect(text).toContain('Type: Project')
    expect(text).toContain('The folder and its files stay on your disk.')
    expect(projectCountText(0)).toBe('No projects plugged in')
    expect(projectCountText(1)).toBe('1 project plugged in')
    expect(projectCountText(2)).toBe('2 projects plugged in')
  })
})
