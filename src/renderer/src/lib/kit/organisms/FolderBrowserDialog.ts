import type { BrowseEntryDto, BrowseListingDto, BrowsePlaceDto } from '@shared/models'
import type { TreeNodeData } from './TreeView'

/** Id of the "Computer" root node (it has no path). */
export const COMPUTER_ID = 'computer'

/** What the dialog needs from the outside: the disk, as folders only. */
export interface FolderBrowserSource {
  browse(path: string): Promise<BrowseListingDto>
  makeFolder(parent: string, name: string): Promise<string>
}

/** Instruction line of the dialog for each reason it opens. */
export const FOLDER_BROWSER_INSTRUCTIONS = {
  desktop: 'Select a folder for the agent to work on.',
  'plug-in': 'Select the project folder to plug in to this desktop.'
} as const

export type FolderBrowserPurpose = keyof typeof FOLDER_BROWSER_INSTRUCTIONS

/** Name given by Make New Folder (the disk makes it unique). */
export const NEW_FOLDER_NAME = 'New Folder'

/** Ids of the two groups at the top of the tree. */
export const RECENT_ID = 'recent'
export const MATCHES_ID = 'matches'

/** Grey row of an open folder that has no subfolders. */
export const EMPTY_FOLDER_TEXT = 'This folder has no subfolders.'

/** Wait after the last key before a typed name is looked up, in milliseconds. */
export const NAME_LOOKUP_DELAY_MS = 400

/** A name the user typed instead of a path: no separator and no drive colon. */
export const isBareName = (text: string): boolean => text !== '' && !/[\\/:]/.test(text)

/** Last part of a path, for either separator. */
const baseName = (path: string): string => path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? path
const parentName = (path: string): string => baseName(path.replace(/[\\/]+$/, '').replace(/[\\/][^\\/]*$/, ''))

/** "login-app", or "login-app (Documents)" when another folder of the list has the same name. */
export function recentLabels(places: BrowsePlaceDto[]): string[] {
  const count = new Map<string, number>()
  for (const p of places) count.set(p.name.toLowerCase(), (count.get(p.name.toLowerCase()) ?? 0) + 1)
  return places.map((p) => ((count.get(p.name.toLowerCase()) ?? 0) > 1 ? `${p.name} (${parentName(p.path)})` : p.name))
}

/** Row shown under a folder that turned out to have no subfolders. */
export const emptyFolderNode = (parentId: string): TreeNodeData => ({ id: `${parentId}::empty`, text: EMPTY_FOLDER_TEXT, disabled: true, testid: 'folder-browser-empty' })

/** Tree ids are unique per place in the tree (the same folder shows under Computer and under Home). */
export const nodeId = (parentId: string, path: string): string => `${parentId}>${path}`

export const entryNode = (parentId: string, entry: BrowseEntryDto, paths: Map<string, string>): TreeNodeData => {
  const id = nodeId(parentId, entry.path)
  paths.set(id, entry.path)
  return { id, text: entry.name, icon: 'folder', hasChildren: entry.hasChildren, testid: 'folder-browser-node', title: entry.path, attrs: { 'data-path': entry.path } }
}

const groupNode = (id: string, text: string, places: BrowsePlaceDto[], labels: string[], paths: Map<string, string>): TreeNodeData => {
  paths.set(id, '')
  const children = places.map((p, i): TreeNodeData => {
    const childId = nodeId(id, p.path)
    paths.set(childId, p.path)
    return { id: childId, text: labels[i], icon: 'folder', hasChildren: true, testid: 'folder-browser-node', title: p.path, attrs: { 'data-path': p.path } }
  })
  return { id, text, icon: 'folder', expanded: true, testid: 'folder-browser-group', attrs: { 'data-path': '' }, children }
}

/** The "Projects you used before" group, or null when there are none. */
export const recentGroup = (places: BrowsePlaceDto[] | undefined, paths: Map<string, string>): TreeNodeData | null =>
  places && places.length > 0 ? groupNode(RECENT_ID, 'Projects you used before', places, recentLabels(places), paths) : null

/** The "Matches" group of a typed name that more than one folder has: each node shows its full path. */
export const matchesGroup = (places: BrowsePlaceDto[], paths: Map<string, string>): TreeNodeData =>
  groupNode(MATCHES_ID, 'Matches', places, places.map((p) => p.path), paths)

/** Id of the node of `path` inside a group (the node a resolved name selects). */
export const groupChildId = (groupId: string, path: string): string => nodeId(groupId, path)

/** The tree without a "Matches" group, then with `group` first when given. */
export const withMatches = (nodes: TreeNodeData[], group: TreeNodeData | null): TreeNodeData[] => {
  const rest = nodes.filter((n) => n.id !== MATCHES_ID)
  return group ? [group, ...rest] : rest
}

export const placeNode = (place: BrowsePlaceDto, paths: Map<string, string>): TreeNodeData => {
  const id = nodeId('place', place.path)
  paths.set(id, place.path)
  return { id, text: place.name, icon: 'folder', hasChildren: true, testid: 'folder-browser-node', title: place.path, attrs: { 'data-path': place.path } }
}

/**
 * The top of the tree: "Computer" (the drives, already loaded and open) and the shortcuts below it.
 * `paths` receives the path of every node made, so the dialog can turn a selected id into a folder.
 */
export function rootNodes(listing: BrowseListingDto, paths: Map<string, string>): TreeNodeData[] {
  paths.set(COMPUTER_ID, '')
  const computer: TreeNodeData = {
    id: COMPUTER_ID,
    text: 'Computer',
    icon: 'computer',
    expanded: true,
    testid: 'folder-browser-node',
    attrs: { 'data-path': '' },
    children: listing.entries.map((e) => entryNode(COMPUTER_ID, e, paths))
  }
  const recent = recentGroup(listing.recent, paths)
  return [...(recent ? [recent] : []), ...listing.places.map((p) => placeNode(p, paths)), computer]
}

/** Folder path as the user typed it, without the quotes Explorer puts around a pasted path. */
export const cleanTypedPath = (text: string): string => text.trim().replace(/^"(.*)"$/, '$1')
