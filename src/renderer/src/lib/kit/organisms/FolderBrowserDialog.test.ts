import { describe, expect, it } from 'vitest'
import { cleanTypedPath, COMPUTER_ID, emptyFolderNode, entryNode, isBareName, matchesGroup, nodeId, RECENT_ID, recentLabels, rootNodes, withMatches } from './FolderBrowserDialog'

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

  it('puts "Projects you used before" first and open, with the full path as tooltip', () => {
    const paths = new Map<string, string>()
    const nodes = rootNodes({ ...listing, recent: [{ name: 'login-app', path: 'C:\\Users\\jo\\login-app' }] }, paths)
    expect(nodes.map((n) => n.text)).toEqual(['Projects you used before', 'Home', 'Computer'])
    expect(nodes[0].id).toBe(RECENT_ID)
    expect(nodes[0].expanded).toBe(true)
    expect(nodes[0].children?.[0].title).toBe('C:\\Users\\jo\\login-app')
  })

  it('hides the group when there are no recent folders', () => {
    expect(rootNodes({ ...listing, recent: [] }, new Map()).map((n) => n.text)).toEqual(['Home', 'Computer'])
  })

  it('shows the parent folder for two folders with the same name', () => {
    const labels = recentLabels([
      { name: 'login-app', path: 'C:\\Users\\jo\\Documents\\login-app' },
      { name: 'Login-App', path: '/home/jo/work/Login-App' },
      { name: 'docs', path: '/home/jo/docs' }
    ])
    expect(labels).toEqual(['login-app (Documents)', 'Login-App (work)', 'docs'])
  })

  it('tells a bare name from a path', () => {
    expect(isBareName('login-app')).toBe(true)
    expect(isBareName('')).toBe(false)
    expect(isBareName('a/b')).toBe(false)
    expect(isBareName('C:\\a')).toBe(false)
  })

  it('replaces the Matches group and words the empty folder row', () => {
    const paths = new Map<string, string>()
    const base = rootNodes(listing, paths)
    const group = matchesGroup([{ name: 'x', path: '/a/x' }, { name: 'x', path: '/b/x' }], paths)
    expect(withMatches(base, group)[0].children?.map((c) => c.text)).toEqual(['/a/x', '/b/x'])
    expect(withMatches(withMatches(base, group), null)).toEqual(base)
    expect(emptyFolderNode('p').text).toBe('This folder has no subfolders.')
  })
})
