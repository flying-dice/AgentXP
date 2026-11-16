import type { Agent7Api } from '@shared/ipc'
import type { FolderDto } from '@shared/models'
import { showFolderBrowser } from '../../kit/organisms/folderBrowser'
import type { FolderBrowserPurpose } from '../../kit/organisms/FolderBrowserDialog'

/**
 * Lets the user choose a folder on their disk and registers it as a project folder.
 * Shows the app's own "Browse For Folder" dialog; resolves null when cancelled.
 * (With `AGENT7_NATIVE_PICKER=1` the operating system's dialog is used instead.)
 */
export async function chooseFolder(api: Pick<Agent7Api, 'fs' | 'folders'>, purpose: FolderBrowserPurpose): Promise<FolderDto | null> {
  if (await api.fs.nativePicker()) return api.folders.pick()
  const path = await showFolderBrowser({ purpose, source: api.fs })
  return path ? api.folders.add(path) : null
}
