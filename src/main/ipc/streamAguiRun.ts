import { EventType, type RunAgentInput } from '@ag-ui/core'
import { EventSchemas, RunAgentInputSchema } from '@ag-ui/core/schemas'
import type { AguiEventMessage } from '../../shared/ipc'
import type { AguiEvent } from '../application/agui/AgentEventTranslator'
import type { AguiRunner } from '../application/agui/AguiRunCoordinator'

/** Validates what the renderer sent to `agui.run`. */
export function parseRunInput(raw: unknown): RunAgentInput {
  const parsed = RunAgentInputSchema.safeParse(raw)
  if (!parsed.success) throw new Error(`Invalid RunAgentInput: ${parsed.error.message}`)
  return parsed.data as RunAgentInput
}

export interface StreamOptions {
  /** Validates every event against @ag-ui/core's schemas; an invalid event ends the run with RUN_ERROR. For development. */
  validate: boolean
  /** True when the receiver is gone; the run is detached (the turn itself keeps going). */
  isClosed(): boolean
  /** Sees every event sent (the Event Viewer's AG-UI tap). A throwing observer is ignored. */
  onEvent?(event: AguiEvent): void
}

/** Pumps one run's AG-UI events to `send` as `{ runId, event }`. Pure transport: no Electron, no translation. */
export async function streamAguiRun(
  runner: AguiRunner,
  input: RunAgentInput,
  send: (message: AguiEventMessage) => void,
  options: StreamOptions
): Promise<void> {
  const emit = (event: AguiEvent): void => {
    try {
      options.onEvent?.(event)
    } catch (error) {
      console.error('AG-UI tap failed', error)
    }
    send({ runId: input.runId, event })
  }
  const stream = runner.run(input)
  try {
    for await (const event of stream) {
      if (options.isClosed()) return
      if (options.validate) {
        const result = EventSchemas.safeParse(event)
        if (!result.success) {
          const message = `Invalid AG-UI event ${String(event.type)}: ${result.error.message}`
          console.error(message, event)
          emit({ type: EventType.RUN_ERROR, message })
          return
        }
      }
      emit(event)
    }
  } catch (error) {
    if (!options.isClosed()) emit({ type: EventType.RUN_ERROR, message: error instanceof Error ? error.message : String(error) })
  } finally {
    await stream.return(undefined)
  }
}
