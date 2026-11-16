import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { PermissionRequestDto } from '@shared/models'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryWindowHost } from '../desktop/ports'
import { createVfsFixture } from '../test-helpers'
import { LauncherService } from './LauncherService'

let f: Awaited<ReturnType<typeof createVfsFixture>>
let host: ReturnType<typeof createMemoryWindowHost>
let pending: PermissionRequestDto[]
let notified: Array<[number, string]>
let removedChats: number[]
let captured: number[]
let launcher: LauncherService

const exists = (path: string): Promise<boolean> => stat(path).then(() => true, () => false)
const pendingFor = (sessionId: number): PermissionRequestDto => ({ id: 1, sessionId, toolCallId: 't', options: [], outcome: 'pending', selectedOptionId: null })

beforeEach(async () => {
  f = await createVfsFixture({ plugProject: false })
  host = createMemoryWindowHost()
  pending = []
  notified = []
  removedChats = []
  captured = []
  launcher = new LauncherService({
    desktops: f.repos.desktops,
    sessions: f.repos.sessions,
    agents: f.repos.agents,
    drives: f.drives,
    vfs: f.vfs,
    desktopService: { rename: (id, title) => f.repos.desktops.rename(id, title), forget: () => {} } as never,
    chats: {
      remove: async (id) => {
        removedChats.push(id)
        f.repos.sessions.remove(id)
      }
    },
    pendingApprovals: () => pending,
    host,
    thumbnails: { urlOf: () => null, captureNow: async (id) => void captured.push(id) },
    notifier: { approvalNeeded: (id, title) => void notified.push([id, title]) },
    clearLog: () => {},
    events: f.publisher
  })
})

describe('LauncherService', () => {
  it('creates a desktop with a seeded C: and the chosen projects as E:, F:', async () => {
    const created = await launcher.create({ title: '  My desktop ', folderIds: [f.folder.id] })
    expect(created).toMatchObject({ title: 'My desktop', connected: false, chatCount: 0, runState: 'idle', pendingApprovals: 0 })
    expect(created.drives.map((d) => d.letter)).toEqual(['C', 'E'])
    expect(await exists(join(f.desktopsDir, String(created.id), 'C', 'Users', 'Agent', 'Documents'))).toBe(true)
    expect(f.publisher.payloads('launcher.changed').length).toBeGreaterThan(0)
  })

  it('names an untitled desktop', async () => {
    expect((await launcher.create({ title: '  ', folderIds: [] })).title).toBe('New Desktop')
  })

  it('connect opens the window, disconnect captures a thumbnail and closes it', async () => {
    const { id } = await launcher.create({ title: 'd', folderIds: [] })
    launcher.connect(id)
    expect(host.connectedIds()).toEqual([id])
    expect(launcher.list()[0]).toMatchObject({ id, connected: true })
    await launcher.disconnect(id)
    expect(captured).toEqual([id])
    expect(host.connectedIds()).toEqual([])
    expect(launcher.list()[0]).toMatchObject({ id, connected: false })
  })

  it('disconnecting keeps the chats and their running state', async () => {
    const { id } = await launcher.create({ title: 'd', folderIds: [] })
    const chat = f.repos.sessions.create({ agentId: f.agentId, desktopId: id, title: 'chat' })
    f.repos.sessions.setStatus(chat.id, 'working')
    launcher.connect(id)
    await launcher.disconnect(id)
    expect(f.repos.sessions.get(chat.id)).toMatchObject({ status: 'working', desktopId: id })
    expect(launcher.list()[0]).toMatchObject({ chatCount: 1, runState: 'working' })
    expect(removedChats).toEqual([])
  })

  it('reports awaiting_approval from the broker and notifies only for a disconnected desktop', async () => {
    const { id } = await launcher.create({ title: 'Needy', folderIds: [] })
    const chat = f.repos.sessions.create({ agentId: f.agentId, desktopId: id, title: 'chat' })
    pending = [pendingFor(chat.id)]
    launcher.onApprovalRequested(chat.id)
    expect(notified).toEqual([[id, 'Needy']])
    expect(launcher.list()[0]).toMatchObject({ runState: 'awaiting_approval', pendingApprovals: 1 })

    launcher.connect(id)
    launcher.onApprovalRequested(chat.id)
    expect(notified).toHaveLength(1)
  })

  it('publishes launcher.changed only when the list changed', async () => {
    await launcher.create({ title: 'd', folderIds: [] })
    const before = f.publisher.payloads('launcher.changed').length
    launcher.publishChanged()
    expect(f.publisher.payloads('launcher.changed')).toHaveLength(before)
  })

  it('a window closed by the user marks the desktop disconnected', async () => {
    const { id } = await launcher.create({ title: 'd', folderIds: [] })
    launcher.connect(id)
    launcher.windowClosed(id)
    expect(f.repos.desktops.get(id)?.isOpen).toBe(false)
  })

  it('remove stops the chats, deletes rows and the C: folder, and only ejects the project', async () => {
    const { id } = await launcher.create({ title: 'd', folderIds: [f.folder.id] })
    const chat = f.repos.sessions.create({ agentId: f.agentId, desktopId: id, title: 'chat' })
    const cDir = join(f.desktopsDir, String(id))
    launcher.connect(id)
    await launcher.remove(id)
    expect(removedChats).toEqual([chat.id])
    expect(host.connectedIds()).toEqual([])
    expect(f.repos.desktops.get(id)).toBeNull()
    expect(f.repos.drives.list(id)).toEqual([])
    expect(await exists(cDir)).toBe(false)
    expect(await exists(f.projectDir)).toBe(true)
    expect(f.repos.folders.get(f.folder.id)).not.toBeNull()
  })

  it('refuses unknown desktops', async () => {
    expect(() => launcher.connect(999)).toThrow(/not found/)
    await expect(launcher.disconnect(999)).rejects.toThrow(/not found/)
    await expect(launcher.remove(999)).rejects.toThrow(/not found/)
  })

  it('resetConnections clears the connected flags at app start', async () => {
    const { id } = await launcher.create({ title: 'd', folderIds: [] })
    launcher.connect(id)
    launcher.resetConnections()
    expect(f.repos.desktops.get(id)?.isOpen).toBe(false)
  })

  it('show asks the host for the launcher window', () => {
    launcher.show()
    expect(host.launcherShown).toBe(1)
  })
})

