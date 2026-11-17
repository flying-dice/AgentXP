import type { AgentXPApi } from '@shared/ipc'
import type { BrowseEntryDto, BrowseListingDto } from '@shared/models'

/** A small disk for stories and unit tests: C: with a user folder holding a few projects. */
const HOME = 'C:\\Users\\jonathan'
const TREE: Record<string, string[]> = {
  'C:\\': ['Users', 'Windows'],
  'C:\\Users': ['jonathan'],
  [HOME]: ['Desktop', 'Documents', 'source'],
  [`${HOME}\\Desktop`]: [],
  [`${HOME}\\Documents`]: ['Letters'],
  [`${HOME}\\Documents\\Letters`]: [],
  [`${HOME}\\source`]: ['login-app', 'new-project'],
  [`${HOME}\\source\\login-app`]: ['src'],
  [`${HOME}\\source\\login-app\\src`]: [],
  [`${HOME}\\source\\new-project`]: [],
  'C:\\Windows': []
}

const join = (parent: string, name: string): string => (parent.endsWith('\\') ? `${parent}${name}` : `${parent}\\${name}`)

/** The `fs` group of the fake backend; folders made with `makeFolder` stay for the session. */
export function createFakeFs(): AgentXPApi['fs'] {
  const tree: Record<string, string[]> = Object.fromEntries(Object.entries(TREE).map(([k, v]) => [k, [...v]]))
  const entry = (path: string): BrowseEntryDto => ({ name: path.split('\\').pop() ?? path, path, hasChildren: (tree[path] ?? []).length > 0 })
  return {
    browse: async (path): Promise<BrowseListingDto> => {
      if (path === '') {
        return {
          path,
          entries: [{ name: 'C:', path: 'C:\\', hasChildren: true }],
          places: [
            { name: 'Home', path: HOME },
            { name: 'Documents', path: `${HOME}\\Documents` },
            { name: 'Desktop', path: `${HOME}\\Desktop` }
          ],
          recent: [{ name: 'login-app', path: `${HOME}\\source\\login-app` }]
        }
      }
      if (!/[\\/:]/.test(path)) {
        const found = Object.keys(tree).filter((k) => k.split('\\').pop()?.toLowerCase() === path.toLowerCase())
        if (found.length === 0) throw new Error(`No folder called '${path}' was found in your recent folders, Documents, Desktop or Home. Type the full path, for example C:\\Users\\you\\${path}, or choose a folder in the list.`)
        return { path: found.length === 1 ? found[0] : '', entries: [], places: [], matches: found.map((p) => ({ name: path, path: p })) }
      }
      const key = path.length > 3 ? path.replace(/\\+$/, '') : path
      const children = tree[key]
      if (!children) throw new Error(`The folder '${path}' cannot be opened. It may not exist, or you may not have permission.`)
      return { path: key, entries: children.map((name) => entry(join(key, name))), places: [] }
    },
    makeFolder: async (parent, name) => {
      const children = tree[parent]
      if (!children) throw new Error(`The folder '${parent}' does not exist.`)
      let unique = name
      for (let n = 2; children.some((c) => c.toLowerCase() === unique.toLowerCase()); n++) unique = `${name} (${n})`
      children.push(unique)
      children.sort((a, b) => a.localeCompare(b))
      tree[join(parent, unique)] = []
      return join(parent, unique)
    },
    nativePicker: async () => false
  }
}
