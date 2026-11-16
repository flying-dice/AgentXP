/**
 * One surface on web_core: a `MessageProcessor` fed with the replayed messages, a `NodeResolver`
 * turning the component list into a reactive node tree, and action dispatch mapped to the app's
 * `A2uiClientEvent`. Framework-agnostic; `A2uiSurface.svelte` renders `root`.
 */
import { NodeResolver, effect, getValue, setValue, signal, type ActionPayload, type ComponentNode, type MessageProcessor, type Signal } from '@a2ui/web_core/v0_9'
import type { A2uiClientEvent, A2uiServerMessage } from '@shared/a2ui'
import { createA2uiProcessor } from '@shared/a2ui/processor'
import { planSync } from './messagePlan'

export interface SurfaceControllerOptions {
  /** Session owning the surface; copied into every event. */
  sessionId?: number
  onaction?: (event: A2uiClientEvent) => void
  /** Receives processing errors (invalid messages); defaults to console.warn. */
  onerror?: (message: string) => void
}

const surfaceIdOf = (message: A2uiServerMessage | undefined): string | undefined => {
  if (!message) return undefined
  const body = Object.entries(message).find(([key]) => key !== 'version')?.[1] as { surfaceId?: unknown } | undefined
  return typeof body?.surfaceId === 'string' ? body.surfaceId : undefined
}

export class SurfaceController {
  private readonly rootSignal = signal<ComponentNode | undefined>(undefined)
  private readonly titleSignal = signal<string | undefined>(undefined)
  private processor: MessageProcessor | undefined
  private resolver: NodeResolver | undefined
  private stopRoot: (() => void) | undefined
  private applied: A2uiServerMessage[] = []
  private surfaceId: string | undefined

  constructor(private options: SurfaceControllerOptions = {}) {}

  /** Root of the node tree; undefined until the root component exists. */
  get root(): Signal<ComponentNode | undefined> {
    return this.rootSignal
  }

  /** `createSurface.theme.title`. */
  get title(): Signal<string | undefined> {
    return this.titleSignal
  }

  setOptions(options: SurfaceControllerOptions): void {
    this.options = options
  }

  /** Brings the surface in line with the replayed `messages` (append, patch or rebuild). */
  sync(messages: readonly A2uiServerMessage[]): void {
    const plan = this.processor ? planSync(this.applied, messages) : ({ kind: 'rebuild' } as const)
    // A surface is created once and deleted for good: anything structural starts over from the full replay.
    const structural = plan.kind === 'apply' && this.processor !== undefined && plan.messages.some((m) => 'createSurface' in m || 'deleteSurface' in m)
    if (plan.kind === 'rebuild' || structural) this.rebuild(messages)
    else this.apply(plan.messages, messages)
  }

  /** Current data model of the surface (what actions send back to the agent). */
  dataModel(): unknown {
    return this.processor && this.surfaceId ? this.processor.getSurface(this.surfaceId)?.dataModel.get('/') : undefined
  }

  dispose(): void {
    this.teardown()
    this.applied = []
  }

  private rebuild(messages: readonly A2uiServerMessage[]): void {
    this.teardown()
    this.surfaceId = surfaceIdOf(messages[0])
    this.processor = createA2uiProcessor((payload) => this.dispatch(payload))
    this.applied = []
    this.apply(messages, messages)
  }

  private apply(batch: readonly A2uiServerMessage[], all: readonly A2uiServerMessage[]): void {
    const processor = this.processor
    if (!processor) return
    for (const message of batch) {
      const errors = processor.processMessagesWithErrors(message)
      for (const e of errors) this.report(e.error.message)
    }
    this.applied = [...all]
    this.attachResolver()
  }

  /** (Re)creates the node resolver once the surface exists. */
  private attachResolver(): void {
    const surface = this.surfaceId ? this.processor?.getSurface(this.surfaceId) : undefined
    if (!surface || this.resolver) {
      this.updateTitle()
      return
    }
    const resolver = new NodeResolver(surface, surface.defaultCatalog)
    this.resolver = resolver
    this.stopRoot = effect(() => {
      setValue(this.rootSignal, getValue(resolver.rootNode))
    })
    this.updateTitle()
  }

  private updateTitle(): void {
    const theme = this.surfaceId ? (this.processor?.getSurface(this.surfaceId)?.theme as { title?: unknown } | undefined) : undefined
    setValue(this.titleSignal, typeof theme?.title === 'string' ? theme.title : undefined)
  }

  private teardown(): void {
    this.stopRoot?.()
    this.stopRoot = undefined
    this.resolver?.dispose()
    this.resolver = undefined
    this.processor?.dispose()
    this.processor = undefined
    setValue(this.rootSignal, undefined)
    setValue(this.titleSignal, undefined)
  }

  private dispatch(payload: ActionPayload): void {
    const { onaction, sessionId } = this.options
    if (!onaction) return
    onaction({
      ...(sessionId === undefined ? {} : { sessionId }),
      surfaceId: payload.surfaceId,
      sourceComponentId: payload.sourceComponentId,
      action: { name: payload.name, context: payload.context },
      dataModel: this.dataModel(),
      timestamp: payload.timestamp
    })
  }

  private report(message: string): void {
    if (this.options.onerror) this.options.onerror(message)
    else console.warn(`[a2ui] ${message}`)
  }
}
