import type { DesktopSummaryDto, NewDesktopInput } from '@shared/vfs'
import type { Id } from '@shared/models'
import type { AgentRepository } from '../../domain/repositories/agent-repository'
import type { DesktopRecord, DesktopRepository } from '../../domain/repositories/desktop-repository'
import type { SessionRepository } from '../../domain/repositories/session-repository'
import type { PermissionRequestDto } from '@shared/models'
import type { DesktopService } from '../desktop/DesktopService'
import type { DesktopWindowHost } from '../desktop/ports'
import { AppError, required } from '../errors'
import type { EventPublisher } from '../ports'
import type { DriveService } from '../vfs/DriveService'
import type { VirtualFileSystem } from '../vfs/VirtualFileSystem'
import { deriveRunState } from './summary'

/** Tells the user a disconnected desktop needs them (an OS notification that connects on click). */
export interface ApprovalNotifier {
  approvalNeeded(desktopId: Id, desktopTitle: string): void
}

export interface LauncherDeps {
  desktops: DesktopRepository
  sessions: SessionRepository
  agents: Pick<AgentRepository, 'getDefault'>
  drives: Pick<DriveService, 'list' | 'plugInFolder'>
  vfs: Pick<VirtualFileSystem, 'seedSystemDisk' | 'deleteDesktopFolder'>
  desktopService: Pick<DesktopService, 'rename' | 'forget'>
  /** Deleting a chat stops its agent. */
  chats: { remove(sessionId: Id): Promise<void> }
  /** Requests that still wait for the user. */
  pendingApprovals(): PermissionRequestDto[]
  host: DesktopWindowHost
  thumbnails: { urlOf(desktopId: Id): string | null; captureNow(desktopId: Id): Promise<void> }
  notifier: ApprovalNotifier
  /** Drops the desktop's protocol events (Event Viewer log). */
  clearLog(desktopId: Id): void
  events: EventPublisher
}

const DEFAULT_TITLE = 'New Desktop'

/**
 * The launcher ("Remote Desktop Connection"): desktops as long-lived projects. A desktop is *connected* while an OS
 * window shows it. Disconnecting only closes that window: agents, turns and permission requests keep running
 * in main (events for a disconnected desktop are simply not delivered; state is rebuilt from the DB on reconnect).
 * Removing a desktop stops its agents and deletes everything virtual; plugged-in folders are only ejected.
 */
export class LauncherService {
  private lastPublished = ''

  constructor(private readonly deps: LauncherDeps) {}

  /** App start: no OS window shows any desktop yet. */
  resetConnections(): void {
    this.deps.desktops.closeAll()
  }

  list(): DesktopSummaryDto[] {
    const connected = new Set(this.deps.host.connectedIds())
    const pending = this.deps.pendingApprovals()
    return this.deps.desktops
      .list()
      .map((d) => this.summary(d, connected.has(d.id), pending))
      .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt) || b.id - a.id)
  }

  async create(input: NewDesktopInput): Promise<DesktopSummaryDto> {
    const title = input.title.trim() || DEFAULT_TITLE
    const agentId = input.agentId ?? this.deps.agents.getDefault()?.id ?? null
    const record = this.deps.desktops.create({ agentId, title, isOpen: false })
    try {
      await this.deps.vfs.seedSystemDisk(record.id)
      for (const folderId of input.folderIds) this.deps.drives.plugInFolder(record.id, folderId)
    } catch (error) {
      this.deps.desktops.remove(record.id)
      await this.deps.vfs.deleteDesktopFolder(record.id)
      throw error
    }
    this.publishChanged()
    return required(this.list().find((d) => d.id === record.id), 'Desktop')
  }

  /** Opens (or focuses) the desktop's OS window. */
  connect(id: Id): void {
    this.record(id)
    this.deps.desktops.setOpen(id, true)
    this.deps.desktops.touch(id)
    this.deps.host.open(id)
    this.publishChanged()
  }

  /** Closes the OS window; nothing else stops. A thumbnail is taken first. */
  async disconnect(id: Id): Promise<void> {
    this.record(id)
    await this.deps.thumbnails.captureNow(id)
    this.deps.host.close(id)
    this.markDisconnected(id)
  }

  /** The user closed the OS window (the manager already took the thumbnail). */
  windowClosed(id: Id): void {
    if (this.deps.desktops.get(id)) this.markDisconnected(id)
  }

  rename(id: Id, title: string): void {
    this.deps.desktopService.rename(id, title)
    this.publishChanged()
  }

  async remove(id: Id): Promise<void> {
    this.record(id)
    this.deps.host.close(id)
    for (const session of this.deps.sessions.listByDesktop(id)) await this.deps.chats.remove(session.id)
    this.deps.desktopService.forget(id)
    this.deps.clearLog(id)
    this.deps.desktops.remove(id) // drives, windows, notes and recycled changes cascade; the real folders are untouched
    await this.deps.vfs.deleteDesktopFolder(id) // C: and the thumbnail
    this.publishChanged()
  }

  show(): void {
    this.deps.host.showLauncher()
  }

  /** A permission request opened: notify when the desktop is not connected, and refresh the list. */
  onApprovalRequested(sessionId: Id): void {
    const desktopId = this.deps.sessions.get(sessionId)?.desktopId
    if (desktopId !== null && desktopId !== undefined && !this.deps.host.connectedIds().includes(desktopId)) {
      const desktop = this.deps.desktops.get(desktopId)
      if (desktop) this.deps.notifier.approvalNeeded(desktopId, desktop.title)
    }
    this.publishChanged()
  }

  /** Publishes `launcher.changed` unless the list is what was published last. */
  publishChanged(): void {
    const list = this.list()
    const json = JSON.stringify(list)
    if (json === this.lastPublished) return
    this.lastPublished = json
    this.deps.events.publish('launcher.changed', list)
  }

  private markDisconnected(id: Id): void {
    this.deps.desktops.setOpen(id, false)
    this.deps.desktops.touch(id)
    this.publishChanged()
  }

  private record(id: Id): DesktopRecord {
    const record = this.deps.desktops.get(id)
    if (!record) throw new AppError('Desktop not found')
    return record
  }

  private summary(d: DesktopRecord, connected: boolean, pending: PermissionRequestDto[]): DesktopSummaryDto {
    const sessions = this.deps.sessions.listByDesktop(d.id)
    const ids = new Set(sessions.map((s) => s.id))
    const pendingApprovals = pending.filter((p) => ids.has(p.sessionId)).length
    return {
      id: d.id,
      title: d.title,
      connected,
      runState: deriveRunState(sessions.map((s) => s.status), pendingApprovals),
      pendingApprovals,
      chatCount: sessions.length,
      drives: this.deps.drives.list(d.id),
      thumbnailUrl: this.deps.thumbnails.urlOf(d.id),
      lastUsedAt: d.lastUsedAt,
      createdAt: d.createdAt
    }
  }
}
