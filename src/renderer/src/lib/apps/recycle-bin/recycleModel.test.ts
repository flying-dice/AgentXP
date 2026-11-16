import { describe, expect, it } from 'vitest'
import type { RecycledChangeDto } from '@shared/desktop'
import { recycleRows, restoreSummary } from './recycleModel'

const item = (id: number, over: Partial<RecycledChangeDto> = {}): RecycledChangeDto => ({ id, desktopId: 1, sessionId: 1, path: 'E:\\src\\auth\\a.ts', revertedText: 'x', restoredText: 'y', revertedAt: `2026-11-16T09:0${id}:00Z`, ...over })

describe('recycleRows', () => {
  it('shows newest first with names, locations and chat titles', () => {
    const rows = recycleRows([item(1), item(2, { path: 'E:\\b.ts', sessionId: null })], [{ id: 1, title: 'Fix bug' }])
    expect(rows.map((r) => r.id)).toEqual(['2', '1'])
    expect(rows[1]).toMatchObject({ name: 'a.ts', location: 'E:\\src\\auth', chat: 'Fix bug' })
    expect(rows[0]).toMatchObject({ name: 'b.ts', location: 'E:\\', chat: '' })
  })
  it('marks agent deletions with the delete icon', () => {
    expect(recycleRows([item(1, { revertedText: null })], [])[0].icon).toBe('delete')
  })
})

describe('restoreSummary', () => {
  it('describes the three kinds', () => {
    expect(restoreSummary(item(1))).toContain('agent\'s version')
    expect(restoreSummary(item(1, { restoredText: null }))).toContain('added')
    expect(restoreSummary(item(1, { revertedText: null }))).toContain('deletes')
  })
})
