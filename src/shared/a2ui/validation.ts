/**
 * Validation of agent-sent A2UI messages with web_core's own `MessageProcessor`: the v0.9 message
 * schema, the catalog (unknown components, bad properties, bindings, actions, theme), JSON
 * pointers and surface integrity are all checked by web_core against a scratch processor, so the
 * rules are exactly the renderer's.
 */
import type { MessageProcessor, RendererErrorMessage } from '@a2ui/web_core/v0_9'
import type { A2uiServerMessage, A2uiSurfaceDto } from '../a2ui'
import { winformsCatalog, type WinformsCatalog } from './catalog'
import { A2UI_VERSION, a2uiSurfaceToMessages } from './messages'
import { createA2uiProcessor } from './processor'

export type A2uiValidation = { ok: true; messages: A2uiServerMessage[] } | { ok: false; errors: string[] }

type Json = Record<string, unknown>
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

const MESSAGE_KINDS = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'] as const

const formatError = (e: RendererErrorMessage): string => {
  const { message, path } = e.error
  return path && path !== '/' && !message.includes(path) ? `${message} (at ${path})` : message
}

/** Adds the default `version` an agent may leave out. */
const withVersion = (message: unknown): unknown =>
  isObject(message) && message.version === undefined ? { version: A2UI_VERSION, ...message } : message

const kindOf = (message: Json): (typeof MESSAGE_KINDS)[number] | undefined => MESSAGE_KINDS.find((k) => k in message)

export class A2uiMessageValidator {
  constructor(private readonly catalog: WinformsCatalog = winformsCatalog) {}

  /**
   * Validates a batch without knowing which surfaces exist: a surface a message refers to but the
   * batch does not create is assumed to exist. Errors are prefixed with the message index and,
   * for updateComponents, the component. The returned messages carry `version`.
   */
  validate(input: unknown): A2uiValidation {
    if (!Array.isArray(input)) return { ok: false, errors: ['messages must be an array'] }
    const processor = this.newProcessor()
    const messages: A2uiServerMessage[] = []
    const errors: string[] = []
    input.forEach((raw, i) => {
      const message = withVersion(raw)
      const found = this.check(processor, message, true).map((e) => `messages[${i}]${e}`)
      errors.push(...found)
      if (found.length === 0) messages.push(message as A2uiServerMessage)
    })
    processor.dispose()
    return errors.length > 0 ? { ok: false, errors } : { ok: true, messages }
  }

  /**
   * Applies `messages` on top of `existing` surfaces in a scratch processor and returns the
   * errors (empty when the batch is valid): unknown surfaces, bad components and so on.
   */
  validateAgainst(existing: readonly A2uiSurfaceDto[], messages: readonly A2uiServerMessage[]): string[] {
    const processor = this.newProcessor()
    for (const surface of existing) this.replay(processor, surface)
    const errors = messages.flatMap((message, i) => this.check(processor, message, false).map((e) => `messages[${i}]${e}`))
    processor.dispose()
    return errors
  }

  private newProcessor(): MessageProcessor {
    return createA2uiProcessor(undefined, this.catalog)
  }

  /** Rebuilds a persisted surface, skipping what no longer validates (it was stored under older rules). */
  private replay(processor: MessageProcessor, surface: A2uiSurfaceDto): void {
    for (const message of a2uiSurfaceToMessages(surface)) {
      if ('updateComponents' in message) {
        for (const component of message.updateComponents.components) {
          processor.processMessagesWithErrors({ ...message, updateComponents: { surfaceId: surface.surfaceId, components: [component] } })
        }
      } else processor.processMessagesWithErrors(message)
    }
  }

  /** Processes one message; returns error strings that continue the `messages[i]` prefix. */
  private check(processor: MessageProcessor, message: unknown, assumeSurface: boolean): string[] {
    if (!isObject(message)) return [': message must be an object']
    const kind = kindOf(message)
    const body = kind ? message[kind] : undefined
    const surfaceId = isObject(body) ? body.surfaceId : undefined
    if (assumeSurface && kind && kind !== 'createSurface' && typeof surfaceId === 'string' && !processor.getSurface(surfaceId)) {
      processor.processMessagesWithErrors({ version: A2UI_VERSION, createSurface: { surfaceId, catalogId: this.catalog.id } })
    }
    const known = typeof surfaceId === 'string' && processor.getSurface(surfaceId) !== undefined
    if (known && kind === 'updateComponents' && isObject(body) && Array.isArray(body.components) && body.components.length > 0) {
      return this.checkComponents(processor, message, body, body.components)
    }
    return processor.processMessagesWithErrors(message).map((e) => `: ${formatError(e)}`)
  }

  /** Checks each component on its own so one message reports every bad component. */
  private checkComponents(processor: MessageProcessor, message: Json, body: Json, components: unknown[]): string[] {
    return components.flatMap((component, j) => {
      const id = isObject(component) && typeof component.id === 'string' ? ` (${component.id})` : ''
      const single = { ...message, updateComponents: { ...body, components: [component] } }
      return processor.processMessagesWithErrors(single).map((e) => `.components[${j}]${id}: ${formatError(e)}`)
    })
  }
}
