import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AgentSessionEvent } from '../../domain/agent/AgentSessionEvent'
import { SessionEventBus } from '../SessionEventBus'
import { createVfsFixture } from '../test-helpers'
import { ToolCallPaths } from './ToolCallPaths'

let f: Awaited<ReturnType<typeof createVfsFixture>>
let paths: ToolCallPaths

beforeEach(async () => {
  f = await createVfsFixture()
  paths = new ToolCallPaths(f.vfs, (sessionId) => (sessionId === 1 ? f.desktop.id : null))
})

const created = (over: Partial<Extract<AgentSessionEvent, { type: 'tool_call_created' }>>): AgentSessionEvent => ({
  type: 'tool_call_created',
  toolCallId: 't1',
  title: 'Read',
  toolKind: 'read',
  status: 'pending',
  rawInput: null,
  rawOutput: null,
  locations: [],
  contents: [],
  ...over
})

describe('ToolCallPaths', () => {
  it('shows host paths in titles, locations and diffs as virtual paths', () => {
    const real = join(f.projectDir, 'src', 'x.ts')
    const event = paths.event(
      1,
      created({
        title: `Read ${real}`,
        locations: [{ path: real, line: 4 }],
        contents: [{ kind: 'diff', path: real, oldText: 'a', newText: 'b' }]
      })
    )
    expect(event).toMatchObject({
      title: 'Read E:\\src\\x.ts',
      locations: [{ path: 'E:\\src\\x.ts', line: 4 }],
      contents: [{ kind: 'diff', path: 'E:\\src\\x.ts' }]
    })
  })

  it('maps several paths in one title and the drive root itself', () => {
    const a = join(f.projectDir, 'a.ts')
    const event = paths.event(1, created({ title: `Move ${a} to ${f.projectDir}` })) as { title: string }
    expect(event.title).toBe('Move E:\\a.ts to E:\\')
  })

  it('maps updates, leaves foreign paths, other siblings and relative paths alone', () => {
    const real = join(f.projectDir, 'b.ts')
    const update: AgentSessionEvent = { type: 'tool_call_updated', toolCallId: 't1', patch: { status: 'completed', title: `Edit ${real}` } }
    expect(paths.event(1, update)).toMatchObject({ patch: { status: 'completed', title: 'Edit E:\\b.ts' } })
    const untouched = created({ title: 'Read /elsewhere/x.ts', locations: [{ path: 'src/x.ts', line: null }, { path: `${f.projectDir}-other/x.ts`, line: null }] })
    expect(paths.event(1, untouched)).toMatchObject({ title: 'Read /elsewhere/x.ts', locations: [{ path: 'src/x.ts' }, { path: `${f.projectDir}-other/x.ts` }] })
  })

  it('leaves chats without a desktop alone', () => {
    const event = created({ title: `Read ${join(f.projectDir, 'x.ts')}` })
    expect(paths.event(2, event)).toBe(event)
  })

  it('is applied by the event bus before listeners see an event', () => {
    const bus = new SessionEventBus((id, e) => paths.event(id, e))
    const seen: AgentSessionEvent[] = []
    bus.subscribe((_id, e) => seen.push(e))
    bus.publish(1, created({ title: `Read ${join(f.projectDir, 'x.ts')}` }))
    expect(seen).toMatchObject([{ title: 'Read E:\\x.ts' }])
  })
})
