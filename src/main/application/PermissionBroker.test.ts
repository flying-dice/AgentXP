import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import type { PermissionPrompt } from '../domain/agent/PermissionPrompter'
import { PermissionBroker } from './PermissionBroker'
import { SessionBroadcaster } from './SessionBroadcaster'
import { createAppFixture, createVfsFixture } from './test-helpers'
import { ToolCallDiffs } from './vfs/ToolCallDiffs'
import { changeCounts } from '@shared/lineCounts'

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
  it('stores a change with the old text the diff reader found', async () => {
    const withDiffs = new PermissionBroker(
      f.repos.permissions,
      f.repos.transcripts,
      f.publisher,
      new SessionBroadcaster(f.repos.sessions, f.publisher),
      (_id, toolCall) => toolCall,
      {
        needsText: () => true,
        withStoredChange: (patch) => patch,
        complete: async (_id, patch) => ({ ...patch, contents: [{ kind: 'diff', path: 'E:\\a.ts', oldText: 'old\n', newText: 'new\n' }] })
      }
    )
    const decision = withDiffs.forSession(f.sessionId).prompt({ ...request(), toolCall: { title: 'Edit a.ts', toolKind: 'edit', contents: [{ kind: 'diff', path: 'E:\\a.ts', oldText: null, newText: 'new\n' }] } })
    await new Promise((r) => setTimeout(r, 0))
    const entry = f.publisher.payloads('transcript.upserted').at(-1)?.entry
    expect(entry).toMatchObject({ kind: 'tool_call', contents: [{ kind: 'diff', oldText: 'old\n' }] })
    withDiffs.respond(pendingRequestId(), 'allow')
    await decision
  })
})

describe('PermissionBroker with the real diff reader (UX-114)', () => {
  const OLD = 'a\nb\nc\nd\ne\n'
  const NEW = 'a\nX\nY\nZ\ne\n'
  let v: Awaited<ReturnType<typeof createVfsFixture>>
  let real: PermissionBroker

  beforeEach(async () => {
    v = await createVfsFixture()
    real = new PermissionBroker(
      v.repos.permissions,
      v.repos.transcripts,
      v.publisher,
      new SessionBroadcaster(v.repos.sessions, v.publisher),
      (_id, toolCall) => toolCall,
      new ToolCallDiffs(v.vfs, () => v.desktop.id)
    )
  })

  const diffOf = () => {
    const entry = v.publisher.payloads('transcript.upserted').at(-1)?.entry
    const content = entry && entry.kind === 'tool_call' ? entry.contents.find((c) => c.kind === 'diff') : undefined
    if (!content || content.kind !== 'diff') throw new Error('no diff stored')
    return content
  }
  const ask = (toolCall: PermissionPrompt['toolCall']) => real.forSession(v.sessionId).prompt({ ...request(), toolCall })
  const answer = async (decision: Promise<unknown>) => {
    real.respond(v.repos.permissions.listPending(v.sessionId)[0]!.id, 'allow')
    await decision
  }

  it('completes a diff that is inside the request', async () => {
    writeFileSync(join(v.projectDir, 'redirect.ts'), OLD)
    const decision = ask({ title: 'Edit', toolKind: 'edit', contents: [{ kind: 'diff', path: 'E:\\redirect.ts', oldText: null, newText: NEW }] })
    await new Promise((r) => setTimeout(r, 20))
    expect(diffOf()).toMatchObject({ oldText: OLD })
    expect(changeCounts(diffOf().oldText, diffOf().newText)).toMatchObject({ additions: 3, deletions: 3 })
    await answer(decision)
  })

  it('completes a diff that only the earlier update of the same call carries', async () => {
    writeFileSync(join(v.projectDir, 'redirect.ts'), OLD)
    v.repos.transcripts.upsertToolCall(v.sessionId, { toolCallId: 'tc-1', title: 'Edit', toolKind: 'edit', contents: [{ kind: 'diff', path: 'E:\\redirect.ts', oldText: null, newText: NEW }] })
    const decision = ask({ title: 'Edit redirect.ts' })
    await new Promise((r) => setTimeout(r, 20))
    expect(diffOf()).toMatchObject({ path: 'E:\\redirect.ts', oldText: OLD, newText: NEW })
    expect(diffOf().oldTextError).toBeUndefined()
    await answer(decision)
  })

  it('shows a file that does not exist yet as new', async () => {
    v.repos.transcripts.upsertToolCall(v.sessionId, { toolCallId: 'tc-1', contents: [{ kind: 'diff', path: 'E:\\created.ts', oldText: null, newText: NEW }] })
    const decision = ask({ title: 'Create created.ts' })
    await new Promise((r) => setTimeout(r, 20))
    expect(diffOf()).toMatchObject({ oldText: '' })
    await answer(decision)
  })

  it('keeps null and says the file cannot be read when the path is a folder, and saves the reason', async () => {
    mkdirSync(join(v.projectDir, 'dir'))
    v.repos.transcripts.upsertToolCall(v.sessionId, { toolCallId: 'tc-1', contents: [{ kind: 'diff', path: 'E:\\dir', oldText: null, newText: NEW }] })
    const decision = ask({ title: 'Edit dir' })
    await new Promise((r) => setTimeout(r, 20))
    expect(diffOf()).toMatchObject({ oldText: null, oldTextError: 'unreadable' })
    expect(v.repos.transcripts.findToolCall(v.sessionId, 'tc-1')?.contents[0]).toMatchObject({ oldTextError: 'unreadable' })
    await answer(decision)
  })

  it('names a file another program holds as in use', async () => {
    const locked = new PermissionBroker(
      v.repos.permissions,
      v.repos.transcripts,
      v.publisher,
      new SessionBroadcaster(v.repos.sessions, v.publisher),
      (_id, toolCall) => toolCall,
      new ToolCallDiffs(
        {
          stat: async () => ({ kind: 'file' }) as never,
          readFile: async () => {
            throw Object.assign(new Error('busy'), { code: 'EBUSY' })
          }
        },
        () => v.desktop.id
      )
    )
    const decision = locked.forSession(v.sessionId).prompt({ ...request(), toolCall: { title: 'Edit', contents: [{ kind: 'diff', path: 'E:\\x.ts', oldText: null, newText: NEW }] } })
    await new Promise((r) => setTimeout(r, 20))
    expect(diffOf()).toMatchObject({ oldText: null, oldTextError: 'in_use' })
    locked.respond(v.repos.permissions.listPending(v.sessionId)[0]!.id, 'allow')
    await decision
  })
})
