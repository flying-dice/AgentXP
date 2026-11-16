import { describe, expect, it } from 'vitest'
import type { FolderDto, SessionDto } from '@shared/models'
import { buildSessionTree, expandableIds, parseNodeId } from './sessionTree'

const folder = (id: number, name: string): FolderDto => ({ id, name, path: `/w/${name}`, lastOpenedAt: null })
const session = (id: number, folderId: number, title: string): SessionDto =>
  ({ id, folderId, title, createdAt: `2026-01-0${id}T00:00:00Z` }) as SessionDto

describe('buildSessionTree', () => {
  const tree = buildSessionTree([folder(1, 'a'), folder(2, 'b')], [session(2, 1, 'second'), session(1, 1, 'first'), session(3, 2, '')], 2)

  it('nests sessions under their folder in creation order', () => {
    expect(tree[0].children?.map((f) => f.text)).toEqual(['a', 'b'])
    expect(tree[0].children?.[0].children?.map((s) => s.text)).toEqual(['first', 'second'])
  })

  it('bolds the active session and names untitled ones', () => {
    expect(tree[0].children?.[0].children?.map((s) => s.bold)).toEqual([false, true])
    expect(tree[0].children?.[1].children?.[0].text).toBe('New session')
  })

  it('lists expandable ids', () => {
    expect(expandableIds(tree)).toEqual(['workspaces', 'f:1', 'f:2'])
  })
})

describe('parseNodeId', () => {
  it('parses folder and session ids', () => {
    expect(parseNodeId('f:3')).toEqual({ kind: 'folder', id: 3 })
    expect(parseNodeId('s:12')).toEqual({ kind: 'session', id: 12 })
    expect(parseNodeId('workspaces')).toBeNull()
  })
})
