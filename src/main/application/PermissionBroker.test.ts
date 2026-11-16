import { beforeEach, describe, expect, it } from 'vitest'
import type { PermissionPrompt } from '../domain/agent/PermissionPrompter'
import { PermissionBroker } from './PermissionBroker'
import { SessionBroadcaster } from './SessionBroadcaster'
import { createAppFixture } from './test-helpers'

let f: ReturnType<typeof createAppFixture>
let broker: PermissionBroker

const request = (signal: AbortSignal = new AbortController().signal): PermissionPrompt => ({
  sessionKey: 'acp',
  toolCallId: 'tc-1',
  toolCall: { title: 'Write file', toolKind: 'edit' },
  options: [
    { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
    { optionId: 'reject', name: 'Reject', kind: 'reject_once' }
  ],
  signal
})

beforeEach(() => {
  f = createAppFixture()
  broker = new PermissionBroker(
    f.repos.permissions,
    f.repos.transcripts,
    f.publisher,
    new SessionBroadcaster(f.repos.sessions, f.publisher)
  )
})

const pendingRequestId = (): number => f.repos.permissions.listPending(f.sessionId)[0]!.id

describe('PermissionBroker', () => {
  it('persists the request, shows it on the tool call and waits for the user', async () => {
    const decision = broker.forSession(f.sessionId).prompt(request())

    expect(f.repos.sessions.get(f.sessionId)?.status).toBe('awaiting_permission')
    const entry = f.publisher.payloads('transcript.upserted').at(-1)?.entry
    expect(entry).toMatchObject({ kind: 'tool_call', toolCallId: 'tc-1', permission: { outcome: 'pending' } })

    broker.respond(pendingRequestId(), 'allow')
    await expect(decision).resolves.toEqual({ outcome: 'selected', optionId: 'allow' })
    expect(f.repos.sessions.get(f.sessionId)?.status).toBe('working')
    expect(f.publisher.payloads('transcript.upserted').at(-1)?.entry).toMatchObject({
      permission: { outcome: 'selected', selectedOptionId: 'allow' }
    })
  })

  it('resolves as cancelled when the user dismisses the request', async () => {
    const decision = broker.forSession(f.sessionId).prompt(request())
    broker.respond(pendingRequestId(), null)
    await expect(decision).resolves.toEqual({ outcome: 'cancelled' })
  })

  it('cancels when the prompt signal aborts', async () => {
    const abort = new AbortController()
    const decision = broker.forSession(f.sessionId).prompt(request(abort.signal))
    const id = pendingRequestId()
    abort.abort()
    await expect(decision).resolves.toEqual({ outcome: 'cancelled' })
    expect(f.repos.permissions.get(id)?.outcome).toBe('cancelled')
    expect(f.repos.sessions.get(f.sessionId)?.status).toBe('working')
  })

  it('lets observers watch pending requests and answer them by id', async () => {
    const changes: string[] = []
    broker.observe((c) => changes.push(`${c.kind}:${c.request.outcome}`))
    const decision = broker.forSession(f.sessionId).prompt(request())
    expect(broker.pendingRequests(f.sessionId)).toHaveLength(1)
    broker.respond(broker.pendingRequests()[0]!.id, 'allow')
    await decision
    expect(changes).toEqual(['requested:pending', 'resolved:selected'])
    expect(broker.pendingRequests()).toEqual([])
  })

  it('rejects an unknown request or option with a readable error', async () => {
    expect(() => broker.respond(999, 'allow')).toThrow('Permission request not found')
    const decision = broker.forSession(f.sessionId).prompt(request())
    expect(() => broker.respond(pendingRequestId(), 'nope')).toThrow('Permission option not found')
    broker.respond(pendingRequestId(), 'reject')
    await decision
  })
})
