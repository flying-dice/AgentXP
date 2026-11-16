/** In-memory LauncherApi for Storybook and tests: a few long-lived desktops with run states and thumbnails. */
import type { Id } from '@shared/models'
import { nextDriveLetter, type DesktopSummaryDto, type DriveDto, type LauncherApi, type LauncherEvents } from '@shared/vfs'
import type { FolderDto } from '@shared/models'
import { systemDrive, usbDrive } from './fakeVfs'

type Emit = <K extends keyof LauncherEvents>(event: K, payload: LauncherEvents[K]) => void

/** A tiny picture of a desktop (wallpaper, a window or two, taskbar) as an inline SVG data URL. */
export function thumbnail(hue: number, windows: 1 | 2 | 3 = 2): string {
  const sky = `hsl(${hue} 70% 55%)`
  const deep = `hsl(${hue + 10} 75% 30%)`
  const win = (x: number, y: number, w: number, h: number): string =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e8eef7" stroke="#27456b"/><rect x="${x}" y="${y}" width="${w}" height="9" fill="#8fb3e0" stroke="#27456b"/>` +
    `<rect x="${x + 5}" y="${y + 15}" width="${w - 22}" height="3" fill="#8da2bc"/><rect x="${x + 5}" y="${y + 22}" width="${w - 14}" height="3" fill="#8da2bc"/><rect x="${x + 5}" y="${y + 29}" width="${w - 30}" height="3" fill="#8da2bc"/>`
  const body = [win(14, 12, 78, 52), win(70, 30, 74, 50), win(30, 44, 64, 34)].slice(0, windows).join('')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${deep}"/><stop offset="1" stop-color="${sky}"/></linearGradient></defs>` +
    `<rect width="160" height="100" fill="url(#g)"/>${body}<rect y="90" width="160" height="10" fill="#26466e"/><rect x="2" y="91" width="9" height="8" rx="2" fill="#5aa0e8"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const minutesAgo = (m: number): string => new Date(Date.UTC(2026, 10, 16, 9, 30 - m)).toISOString()

const claude: FolderDto = { id: 1, name: 'claude-code-win', path: 'C:\\Users\\jonathan\\source\\claude-code-win', lastOpenedAt: null }
const dotfiles: FolderDto = { id: 2, name: 'dotfiles', path: 'C:\\Users\\jonathan\\dotfiles', lastOpenedAt: null }

export function sampleDesktops(): DesktopSummaryDto[] {
  return [
    { id: 1, title: 'claude-code-win', connected: true, runState: 'working', pendingApprovals: 0, chatCount: 3, drives: [systemDrive(), usbDrive('E', claude)], thumbnailUrl: thumbnail(210, 3), lastUsedAt: minutesAgo(2), createdAt: '2026-11-02T08:00:00Z' },
    { id: 2, title: 'Dotfiles and shell', connected: false, runState: 'awaiting_approval', pendingApprovals: 2, chatCount: 1, drives: [systemDrive(), usbDrive('E', dotfiles)], thumbnailUrl: thumbnail(170, 2), lastUsedAt: minutesAgo(45), createdAt: '2026-11-09T14:20:00Z' },
    { id: 3, title: 'Scratch pad', connected: false, runState: 'idle', pendingApprovals: 0, chatCount: 0, drives: [systemDrive()], thumbnailUrl: thumbnail(260, 1), lastUsedAt: '2026-11-13T17:05:00Z', createdAt: '2026-11-13T17:00:00Z' }
  ]
}

export interface FakeLauncherOptions {
  desktops?: DesktopSummaryDto[]
  /** Folders the New desktop dialog can plug in. */
  folders: () => FolderDto[]
  emit: Emit
}

export function createFakeLauncher(options: FakeLauncherOptions): LauncherApi {
  let items = options.desktops ?? sampleDesktops()
  let nextId = 50
  const publish = (): void => options.emit('launcher.changed', items.map((d) => ({ ...d })))
  const patch = (id: Id, change: Partial<DesktopSummaryDto>): void => {
    items = items.map((d) => (d.id === id ? { ...d, ...change } : d))
    publish()
  }
  return {
    list: async () => items.map((d) => ({ ...d })),
    create: async (input) => {
      const drives: DriveDto[] = [systemDrive()]
      for (const folderId of input.folderIds) {
        const folder = options.folders().find((f) => f.id === folderId)
        const letter = nextDriveLetter(drives.map((d) => d.letter))
        if (folder && letter) drives.push(usbDrive(letter, folder, new Date().toISOString()))
      }
      const now = new Date().toISOString()
      const created: DesktopSummaryDto = { id: nextId++, title: input.title, connected: false, runState: 'idle', pendingApprovals: 0, chatCount: 0, drives, thumbnailUrl: thumbnail(190 + nextId * 17, 1), lastUsedAt: now, createdAt: now }
      items = [...items, created]
      publish()
      return created
    },
    connect: async (id) => patch(id, { connected: true, lastUsedAt: new Date().toISOString() }),
    disconnect: async (id) => patch(id, { connected: false }),
    rename: async (id, title) => patch(id, { title }),
    remove: async (id) => {
      items = items.filter((d) => d.id !== id)
      publish()
    },
    show: async () => {}
  }
}
