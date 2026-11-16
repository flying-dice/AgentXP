import { basename, resolve } from 'node:path'
import type { FileNodeDto, FolderDto, Id } from '@shared/models'
import type { FolderRepository } from '../domain/repositories/folder-repository'
import { AppError, required } from './errors'
import type { EventPublisher, FolderBrowser, FolderPicker } from './ports'

/** Registered workspace folders and sandboxed browsing of them. */
export class FolderService {
  constructor(
    private readonly folders: FolderRepository,
    private readonly browser: FolderBrowser,
    private readonly picker: FolderPicker,
    private readonly events: EventPublisher
  ) {}

  list(): FolderDto[] {
    return this.folders.list()
  }

  require(id: Id): FolderDto {
    return required(this.folders.get(id), 'Folder')
  }

  async pick(): Promise<FolderDto | null> {
    const path = await this.picker.pickFolder()
    return path ? this.add(path) : null
  }

  add(path: string): FolderDto {
    const absolute = resolve(path.trim())
    if (!path.trim()) throw new AppError('A folder path is required')
    const folder = this.folders.add(absolute, basename(absolute) || absolute)
    this.folders.touch(folder.id)
    this.publishChanged()
    return required(this.folders.get(folder.id), 'Folder')
  }

  remove(id: Id): void {
    required(this.folders.remove(id) || null, 'Folder')
    this.publishChanged()
  }

  readDir(folderId: Id, relativePath: string): Promise<FileNodeDto[]> {
    return this.browser.list(this.require(folderId).path, relativePath)
  }

  readFile(folderId: Id, relativePath: string): Promise<string> {
    return this.browser.readText(this.require(folderId).path, relativePath)
  }

  gitBranch(folderId: Id): Promise<string | null> {
    return this.browser.gitBranch(this.require(folderId).path)
  }

  private publishChanged(): void {
    this.events.publish('folders.changed', this.folders.list())
  }
}
