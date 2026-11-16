import { describe, expect, it } from 'vitest'
import type { FileNodeDto } from '@shared/models'
import { buildFileTree, dirOfNode, fileOfNode } from './fileTree'

const listings = new Map<string, FileNodeDto[]>([
  ['', [{ name: 'src', path: 'src', isDirectory: true }, { name: 'README.md', path: 'README.md', isDirectory: false }]],
  ['src', [{ name: 'a.ts', path: 'src/a.ts', isDirectory: false }]]
])

describe('buildFileTree', () => {
  it('nests loaded directories and leaves others lazy', () => {
    const [root] = buildFileTree('proj', new Map([...listings].filter(([k]) => k === '')), [])
    expect(root.children?.map((c) => c.text)).toEqual(['src', 'README.md'])
    expect(root.children?.[0].children).toBeUndefined()
    expect(root.children?.[0].hasChildren).toBe(true)
  })

  it('marks changed files with M, tolerating backslashes', () => {
    const [root] = buildFileTree('proj', listings, ['src\\a.ts'])
    expect(root.children?.[0].children?.[0].badge).toBe('M')
    expect(root.children?.[1].badge).toBeUndefined()
  })

  it('maps node ids back to paths', () => {
    expect(dirOfNode('root')).toBe('')
    expect(dirOfNode('d:src')).toBe('src')
    expect(dirOfNode('f:src/a.ts')).toBeNull()
    expect(fileOfNode('f:src/a.ts')).toBe('src/a.ts')
  })
})
