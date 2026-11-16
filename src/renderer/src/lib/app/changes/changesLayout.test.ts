import { describe, expect, it } from 'vitest'
import type { RecycledChangeDto } from '@shared/desktop'
import { DIFF_MIN_HEIGHT, LIST_MIN_HEIGHT, defaultListHeight, readListSize, revertedRows, writeListSize } from './changesLayout'

const entry = (id: number, path: string, sessionId: number | null, revertedAt = `2026-11-16T10:0${id}:00Z`): RecycledChangeDto => ({
  id,
  desktopId: 1,
  sessionId,
  path,
  revertedText: null,
  restoredText: null,
  revertedAt
})

describe('the height of the list (UX-116)', () => {
  it('has room for two to four rows and leaves the rest to the diff', () => {
    expect(defaultListHeight(0)).toBe(defaultListHeight(2))
    expect(defaultListHeight(3)).toBeGreaterThan(defaultListHeight(2))
    expect(defaultListHeight(30)).toBe(defaultListHeight(4))
    expect(DIFF_MIN_HEIGHT).toBeGreaterThanOrEqual(8 * 17)
  })

  it('remembers the height the user chose for a window, and survives a store that fails', () => {
    const memory = new Map<string, string>()
    const store = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v) }
    expect(readListSize(store, 'chat-1')).toBeNull()
    writeListSize(store, 'chat-1', 140.4)
    expect(readListSize(store, 'chat-1')).toBe(140)
    expect(readListSize(store, 'chat-2')).toBeNull()
    writeListSize(store, 'chat-3', 4)
    expect(readListSize(store, 'chat-3')).toBeNull()
    expect(LIST_MIN_HEIGHT).toBeGreaterThan(4)
    const broken = {
      getItem: (): string => {
        throw new Error('blocked')
      },
      setItem: (): void => {
        throw new Error('blocked')
      }
    }
    expect(readListSize(broken, 'x')).toBeNull()
    expect(() => writeListSize(broken, 'x', 100)).not.toThrow()
    expect(readListSize(null, 'x')).toBeNull()
    expect(() => writeListSize(null, 'x', 100)).not.toThrow()
  })
})

describe('reverted rows (UX-117)', () => {
  it('lists the Recycle Bin entries of the chats, oldest first', () => {
    const rows = revertedRows([entry(2, 'E:\\b.ts', 5), entry(1, 'E:\\a.ts', 5), entry(3, 'E:\\c.ts', 9), entry(4, 'E:\\d.ts', null)], [5], [])
    expect(rows).toEqual([
      { id: 1, path: 'E:\\a.ts' },
      { id: 2, path: 'E:\\b.ts' }
    ])
  })

  it('shows a file once, and not while the agent has a pending change on it again', () => {
    const recycled = [entry(1, 'E:\\a.ts', 5, '2026-11-16T10:00:00Z'), entry(2, 'e:/A.ts', 5, '2026-11-16T11:00:00Z'), entry(3, 'E:\\b.ts', 5)]
    expect(revertedRows(recycled, [5], [])).toEqual([
      { id: 3, path: 'E:\\b.ts' },
      { id: 2, path: 'e:/A.ts' }
    ])
    expect(revertedRows(recycled, [5], [{ path: 'E:\\a.ts' }])).toEqual([{ id: 3, path: 'E:\\b.ts' }])
  })

  it('is empty without chats', () => {
    expect(revertedRows([entry(1, 'E:\\a.ts', 5)], [], [])).toEqual([])
  })
})
