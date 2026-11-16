import type { AppEventName, AppEvents, EventPublisher } from './ports'

/** One published event as data, so listeners can `switch` on `name` and get the matching payload type. */
export type AppEventMessage = { [K in AppEventName]: { name: K; payload: AppEvents[K] } }[AppEventName]

export type AppEventListener = (message: AppEventMessage) => void

/** Forwards every event to the downstream publisher and to in-process listeners (e.g. the AG-UI backend). */
export class FanOutEventPublisher implements EventPublisher {
  private readonly listeners = new Set<AppEventListener>()

  constructor(private readonly downstream: EventPublisher) {}

  /** Returns an unsubscribe function. */
  subscribe(listener: AppEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  publish<K extends AppEventName>(event: K, payload: AppEvents[K]): void {
    this.downstream.publish(event, payload)
    const message = { name: event, payload } as AppEventMessage
    for (const listener of [...this.listeners]) {
      try {
        listener(message)
      } catch (error) {
        console.error('Event listener failed', error)
      }
    }
  }
}
