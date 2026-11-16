import { describe, expect, it } from 'vitest'
import type { AgentSessionEvent } from '../domain/agent/AgentSessionEvent'
import { CompositeA2uiSink } from './CompositeA2uiSink'
import { SessionEventBus } from './SessionEventBus'

const event: AgentSessionEvent = { type: 'mode_changed', modeId: 'plan' }

describe('SessionEventBus', () => {
  it('fans events out to every subscriber with the session id, and unsubscribes', () => {
    const bus = new SessionEventBus()
    const a: unknown[] = []
    const b: unknown[] = []
    const offA = bus.subscribe((id, e) => a.push([id, e]))
    bus.subscribe(() => {
      throw new Error('listener bug')
    })
    bus.subscribe((id, e) => b.push([id, e]))
    const quiet = console.error
    console.error = () => {}
    bus.forSession(7).emit('acp-key', event)
    offA()
    bus.forSession(7).emit('acp-key', event)
    console.error = quiet
    expect(a).toEqual([[7, event]])
    expect(b).toHaveLength(2)
  })
})

describe('CompositeA2uiSink', () => {
  it('applies to all sinks and merges errors', async () => {
    const seen: string[] = []
    const ok = { apply: async (k: string) => (seen.push(`ok:${k}`), { ok: true as const }) }
    const bad = { apply: async () => ({ ok: false as const, errors: ['nope'] }) }
    expect(await new CompositeA2uiSink(ok, ok).apply('1', [])).toEqual({ ok: true })
    expect(await new CompositeA2uiSink(ok, bad).apply('1', [])).toEqual({ ok: false, errors: ['nope'] })
    expect(seen).toHaveLength(3)
  })
})
