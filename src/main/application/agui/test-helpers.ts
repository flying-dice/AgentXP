import { AbstractAgent, verifyEvents, type RunAgentInput } from '@ag-ui/client'
import type { BaseEvent } from '@ag-ui/core'
import { EventSchemas } from '@ag-ui/core/schemas'
import { Observable, from, lastValueFrom, toArray } from 'rxjs'
import type { AguiEvent } from './AgentEventTranslator'
import type { AguiRunner } from './AguiRunCoordinator'

export async function collect<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = []
  for await (const item of stream) out.push(item)
  return out
}

/** Every event validates against the AG-UI schemas and the sequence obeys the protocol rules (verifyEvents). */
export async function expectValidStream(events: AguiEvent[]): Promise<void> {
  for (const event of events) {
    const parsed = EventSchemas.safeParse(event)
    if (!parsed.success) throw new Error(`Invalid ${String(event.type)} event: ${parsed.error.message}\n${JSON.stringify(event)}`)
  }
  await lastValueFrom(from(events as BaseEvent[]).pipe(verifyEvents(false), toArray()))
}

export const types = (events: AguiEvent[]): string[] => events.map((e) => e.type)

/** A real AG-UI client agent over a runner (what the renderer's IpcAgent does over IPC). */
export class RunnerAgent extends AbstractAgent {
  readonly runs: AguiEvent[][] = []

  constructor(private readonly runner: AguiRunner, threadId: string) {
    super({ threadId })
  }

  run(input: RunAgentInput): Observable<BaseEvent> {
    const events: AguiEvent[] = []
    this.runs.push(events)
    return new Observable<BaseEvent>((subscriber) => {
      void (async () => {
        try {
          for await (const event of this.runner.run(input)) {
            events.push(event)
            subscriber.next(event as BaseEvent)
          }
          subscriber.complete()
        } catch (error) {
          subscriber.error(error)
        }
      })()
    })
  }

  protected override connect(input: RunAgentInput): Observable<BaseEvent> {
    return this.run(input)
  }
}
