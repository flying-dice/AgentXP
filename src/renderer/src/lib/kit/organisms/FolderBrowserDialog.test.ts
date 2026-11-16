import { describe, expect, it } from 'vitest'
import { cleanTypedPath, COMPUTER_ID, entryNode, nodeId, rootNodes } from './FolderBrowserDialog'

describe('Browse For Folder tree model', () => {
  const listing = {
    path: '',
    entries: [{ name: 'C:', path: 'C:\\', hasChildren: true }],
    places: [{ name: 'Home', path: 'C:\\Users\\jo' }]
  }

  it('puts the shortcuts above an open Computer node that holds the drives', () => {
    const paths = new Map<string, string>()
    const nodes = rootNodes(listing, paths)
    expect(nodes.map((n) => n.text)).toEqual(['Home', 'Computer'])
    expect(nodes[1].expanded).toBe(true)
    expect(nodes[1].children?.map((n) => n.text)).toEqual(['C:'])
    expect(paths.get(COMPUTER_ID)).toBe('')
    expect(paths.get(nodes[0].id)).toBe('C:\\Users\\jo')
  })

  it('gives the same folder a different id under each parent', () => {
    const paths = new Map<string, string>()
    const entry = { name: 'jo', path: 'C:\\Users\\jo', hasChildren: false }
    const under = entryNode(COMPUTER_ID, entry, paths)
    const other = entryNode('place', entry, paths)
    expect(under.id).not.toBe(other.id)
    expect(under.id).toBe(nodeId(COMPUTER_ID, entry.path))
    expect(paths.get(other.id)).toBe(entry.path)
  })

  it('strips quotes around a pasted path', () => {
    expect(cleanTypedPath('  "C:\\a b"  ')).toBe('C:\\a b')
    expect(cleanTypedPath('/home/x')).toBe('/home/x')
  })
})
