import type { A2uiServerMessage } from '@shared/a2ui'
import type { A2uiApplyOptions, A2uiMessageSink, A2uiSinkResult } from '../domain/a2ui/ports'

/** Forwards A2UI messages to several sinks; fails when any of them fails. */
export class CompositeA2uiSink implements A2uiMessageSink {
  private readonly sinks: A2uiMessageSink[]

  constructor(...sinks: A2uiMessageSink[]) {
    this.sinks = sinks
  }

  add(sink: A2uiMessageSink): void {
    this.sinks.push(sink)
  }

  async apply(sessionKey: string, messages: A2uiServerMessage[], options?: A2uiApplyOptions): Promise<A2uiSinkResult> {
    const results = await Promise.all(this.sinks.map((s) => s.apply(sessionKey, messages, options)))
    const errors = results.flatMap((r) => (r.ok ? [] : r.errors))
    if (errors.length > 0) return { ok: false, errors }
    const notes = results.flatMap((r) => (r.ok ? (r.notes ?? []) : []))
    return notes.length > 0 ? { ok: true, notes } : { ok: true }
  }
}
