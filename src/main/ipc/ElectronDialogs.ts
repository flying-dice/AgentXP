import { writeFile } from 'node:fs/promises'
import { BrowserWindow, dialog, shell } from 'electron'
import type { FilePicker, FolderPicker, PathOpener, TextFileSaver } from '../application/ports'

const focusedWindow = (): BrowserWindow | undefined => BrowserWindow.getFocusedWindow() ?? undefined

export class ElectronFolderPicker implements FolderPicker {
  async pickFolder(): Promise<string | null> {
    const options = { properties: ['openDirectory' as const, 'createDirectory' as const] }
    const win = focusedWindow()
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    return result.canceled ? null : (result.filePaths[0] ?? null)
  }
}

export class ElectronFilePicker implements FilePicker {
  async pickFiles(): Promise<string[]> {
    const options = { properties: ['openFile' as const, 'multiSelections' as const] }
    const win = focusedWindow()
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    return result.canceled ? [] : result.filePaths
  }
}

export class ElectronTextFileSaver implements TextFileSaver {
  async saveText(defaultName: string, content: string): Promise<string | null> {
    const options = { defaultPath: defaultName, filters: [{ name: 'Markdown', extensions: ['md'] }] }
    const win = focusedWindow()
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return null
    await writeFile(result.filePath, content, 'utf8')
    return result.filePath
  }
}

export class ElectronPathOpener implements PathOpener {
  async open(path: string): Promise<void> {
    const failure = await shell.openPath(path)
    if (failure) throw new Error(failure)
  }
}
