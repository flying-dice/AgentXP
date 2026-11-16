import { describe, expect, it, vi } from 'vitest'
import type { FileChangeDto } from '@shared/models'
import { changeRowItems, undoRevertItem } from './changeMenu'

const change = (kind: FileChangeDto['kind'] = 'modified'): FileChangeDto => ({ id: 1, kind, path: 'src\\a.ts' }) as FileChangeDto

describe('changeRowItems', () => {
  it('a changed row offers Revert and Open in editor, each running its action on the change', () => {
    const onrevert = vi.fn()
    const onopeneditor = vi.fn()
    const items = changeRowItems({ change: change(), onrevert, onopeneditor })
    expect(items.map((i) => i.testid)).toEqual(['changes-ctx-revert', 'changes-ctx-open-editor'])
    items[0].action?.()
    items[1].action?.()
    expect(onrevert).toHaveBeenCalledWith(change())
    expect(onopeneditor).toHaveBeenCalledWith(change())
  })
  it('a deleted file cannot be opened, and the item says why', () => {
    const [, open] = changeRowItems({ change: change('deleted'), onrevert: vi.fn(), onopeneditor: vi.fn() })
    expect(open.disabled).toBe(true)
    expect(open.title).toContain('deleted')
  })
  it('a reverted row offers Restore from the Recycle Bin', () => {
    const onopenrecyclebin = vi.fn()
    const items = changeRowItems({ change: null, onopenrecyclebin })
    expect(items).toHaveLength(1)
    expect(items[0].label).toContain('Restore from the Recycle Bin')
    items[0].action?.()
    expect(onopenrecyclebin).toHaveBeenCalled()
  })
  it('leaves out what has no action', () => {
    expect(changeRowItems({ change: null })).toEqual([])
    expect(changeRowItems({ change: change() })).toEqual([])
  })
})

describe('undoRevertItem', () => {
  it('is there only while a revert can be undone', () => {
    expect(undoRevertItem(false, vi.fn())).toEqual([])
    const [separator, item] = undoRevertItem(true, vi.fn())
    expect(separator.separator).toBe(true)
    expect(item.testid).toBe('chat-menu-undo-revert')
  })
})
