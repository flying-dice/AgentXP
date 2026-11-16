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

/** Tree ids are unique per place in the tree (the same folder shows under Computer and under Home). */
export const nodeId = (parentId: string, path: string): string => `${parentId}>${path}`

export const entryNode = (parentId: string, entry: BrowseEntryDto, paths: Map<string, string>): TreeNodeData => {
  const id = nodeId(parentId, entry.path)
  paths.set(id, entry.path)
  return { id, text: entry.name, icon: 'folder', hasChildren: entry.hasChildren, testid: 'folder-browser-node', attrs: { 'data-path': entry.path } }
}

const placeNode = (place: BrowsePlaceDto, paths: Map<string, string>): TreeNodeData => {
  const id = nodeId('place', place.path)
  paths.set(id, place.path)
  return { id, text: place.name, icon: 'folder', hasChildren: true, testid: 'folder-browser-node', attrs: { 'data-path': place.path } }
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
  return [...listing.places.map((p) => placeNode(p, paths)), computer]
}

/** Folder path as the user typed it, without the quotes Explorer puts around a pasted path. */
export const cleanTypedPath = (text: string): string => text.trim().replace(/^"(.*)"$/, '$1')
