import { describe, expect, it } from 'vitest'
import type { VfsEntryDto } from '@shared/vfs'
import { buildFileTree, dirOfNode, fileOfNode } from './fileTree'

const entry = (path: string, kind: 'file' | 'directory'): VfsEntryDto => ({ name: path.split('\\').pop()!, path, kind, size: null, modifiedAt: null })
const roots = [{ path: 'E:\\', name: 'proj (E:)' }]
const listings = new Map<string, VfsEntryDto[]>([
  ['E:\\', [entry('E:\\src', 'directory'), entry('E:\\README.md', 'file')]],
  ['E:\\src', [entry('E:\\src\\a.ts', 'file')]]
])

describe('buildFileTree', () => {
  it('nests loaded directories and leaves others lazy', () => {
    const [root] = buildFileTree(roots, new Map([...listings].filter(([k]) => k === 'E:\\')), [])
    expect(root.text).toBe('proj (E:)')
    expect(root.children?.map((c) => c.text)).toEqual(['src', 'README.md'])
    expect(root.children?.[0].children).toBeUndefined()
    expect(root.children?.[0].hasChildren).toBe(true)
  })

  it('marks changed files with M, normalising the paths', () => {
    const [root] = buildFileTree(roots, listings, ['e:/src/a.ts'])
    expect(root.children?.[0].children?.[0].badge).toBe('M')
    expect(root.children?.[1].badge).toBeUndefined()
  })

  it('makes one node per root', () => {
    expect(buildFileTree([...roots, { path: 'F:\\', name: 'dotfiles (F:)' }], new Map(), [])).toHaveLength(2)
  })

  it('maps node ids back to paths', () => {
    expect(dirOfNode('d:E:\\src')).toBe('E:\\src')
    expect(dirOfNode('f:E:\\src\\a.ts')).toBeNull()
    expect(fileOfNode('f:E:\\src\\a.ts')).toBe('E:\\src\\a.ts')
  })
})
