import { AbstractAgent, type AgentConfig } from '@ag-ui/client'
import { EventType, type BaseEvent, type RunAgentInput } from '@ag-ui/core'
import { Observable } from 'rxjs'
import type { AguiApi } from '@shared/ipc'

const isTerminal = (event: BaseEvent): boolean => event.type === EventType.RUN_FINISHED || event.type === EventType.RUN_ERROR

/**
 * An AG-UI agent whose backend is the Electron main process: `run(input)` invokes `agui.run` and
 * turns the events main sends on `agui.event` into the observable AbstractAgent expects.
 * The thread id is the session id. `connect` is a run without a new message and without `resume`
 * (the backend answers it with the persisted messages and state), so `connectAgent()` works.
 */
export class IpcAgent extends AbstractAgent {
  private lastRunId = ''

  constructor(
    private readonly api: AguiApi = window.agentxp.agui,
    config?: AgentConfig
  ) {
    super(config)
  }

  run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((subscriber) => {
      let settled = false
      let unlisten = (): void => {}
      const settle = (end: () => void): void => {
        if (settled) return
        settled = true
        unlisten()
        end()
      }
      // Listen before invoking so no event is missed.
      unlisten = this.api.onEvent(input.runId, (event) => {
        if (settled) return
        subscriber.next(event)
        if (isTerminal(event)) settle(() => subscriber.complete())
      })
      this.lastRunId = input.runId
      this.api.run(input).then(
        // Main always ends a stream with RUN_FINISHED or RUN_ERROR; this is only the safety net if it did not.
        () => setTimeout(() => settle(() => subscriber.complete()), 0),
        (error: unknown) => settle(() => subscriber.error(error instanceof Error ? error : new Error(String(error))))
      )
      return () => {
        settled = true
        unlisten()
      }
    })
  }

  protected override connect(input: RunAgentInput): Observable<BaseEvent> {
    return this.run(input)
  }

  /** Cancels the turn of this thread; resolves when main has handled it. */
  abort(): Promise<void> {
    return this.api.abort(this.threadId, this.lastRunId)
  }

  override abortRun(): void {
    void this.abort().catch((error: unknown) => console.error('Aborting the run failed', error))
  }

  override clone(): IpcAgent {
    const copy = super.clone() as IpcAgent
    Object.assign(copy, { api: this.api, lastRunId: this.lastRunId })
    return copy
  }
}
