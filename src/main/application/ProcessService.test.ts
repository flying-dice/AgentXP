import { beforeEach, describe, expect, it } from 'vitest'
import { AgentConnectionPool } from './AgentConnectionPool'
import { ProcessService } from './ProcessService'
import { SessionBroadcaster } from './SessionBroadcaster'
import { createAppFixture, FakeLiveConnection } from './test-helpers'

let f: ReturnType<typeof createAppFixture>
let pool: AgentConnectionPool
let service: ProcessService

beforeEach(() => {
  f = createAppFixture()
  pool = new AgentConnectionPool()
  service = new ProcessService(pool, f.repos.sessions, f.repos.agents, new SessionBroadcaster(f.repos.sessions, f.publisher))
})

const live = (acp: string, pid?: number) => {
  const connection = new FakeLiveConnection(acp)
  if (pid !== undefined) Object.defineProperty(connection, 'pid', { value: pid })
  return { connection, acpSessionId: acp }
}

describe('ProcessService', () => {
  it('groups live chats by agent and desktop', () => {
    const desktop = f.db.prepare("INSERT INTO desktops (title) VALUES ('d')").run().lastInsertRowid
    const a = f.repos.sessions.create({ agentId: f.agentId, desktopId: Number(desktop), title: 'a' })
    const b = f.repos.sessions.create({ agentId: f.agentId, desktopId: Number(desktop), title: 'b' })
    pool.add(a.id, live('1', 4312))
    pool.add(b.id, live('2'))
    pool.add(f.sessionId, live('3')) // no desktop: not listed
    expect(service.list()).toEqual([{ agentId: f.agentId, agentName: 'Claude Code', desktopId: Number(desktop), pid: 4312, sessionIds: [a.id, b.id] }])
  })

  it('ends a process: its chats are disposed and show as closed', async () => {
    const desktop = Number(f.db.prepare("INSERT INTO desktops (title) VALUES ('d')").run().lastInsertRowid)
    const a = f.repos.sessions.create({ agentId: f.agentId, desktopId: desktop, title: 'a' })
    const conn = live('1')
    pool.add(a.id, conn)
    await service.end(f.agentId, desktop)
    expect(conn.connection.disposed).toBe(true)
    expect(f.repos.sessions.get(a.id)?.status).toBe('closed')
    expect(service.list()).toEqual([])
  })
})
