import { contentToText, type ContentPart, type Message, type ResumeEntry, type RunAgentInput } from '@ag-ui/core'
import type { A2uiClientEvent } from '@shared/a2ui'
import { DESKTOP_CONTEXT_DESCRIPTION } from '@shared/desktop'
import { AppError } from '../errors'
import { fileUrlToPath } from './fileUrl'

/** What a RunAgentInput asks the backend to do. Precedence: resume, a2ui action, new prompt, connect. */
export type RunIntent =
  | { kind: 'resume'; entries: ResumeEntry[] }
  | { kind: 'a2ui'; event: A2uiClientEvent }
  | { kind: 'prompt'; messageId: string; text: string; attachments: string[]; desktopContext: string | null }
  | { kind: 'connect' }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

function a2uiActionOf(forwardedProps: unknown): A2uiClientEvent | null {
  if (!isRecord(forwardedProps) || forwardedProps['a2uiAction'] === undefined) return null
  const event = forwardedProps['a2uiAction']
  if (!isRecord(event) || typeof event['surfaceId'] !== 'string' || !isRecord(event['action'])) {
    throw new AppError('forwardedProps.a2uiAction is not an A2UI client event')
  }
  return event as unknown as A2uiClientEvent
}

/** Attachments are non-text parts with a `file:` URL source; anything else cannot be handed to the agent. */
function attachmentsOf(parts: ContentPart[]): string[] {
  return parts.flatMap((part) => {
    if (part.type === 'text') return []
    if (part.source.type === 'url' && part.source.value.startsWith('file:')) return [fileUrlToPath(part.source.value)]
    throw new AppError(`Unsupported ${part.type} attachment: only local files (file: URLs) can be sent`)
  })
}

/** The desktop state the client sent along (`context` entry `agentxp.desktop`), as JSON text. */
function desktopContextOf(input: RunAgentInput): string | null {
  const entry = input.context?.find((c) => c.description === DESKTOP_CONTEXT_DESCRIPTION)
  return entry?.value ? entry.value : null
}

function promptOf(message: Extract<Message, { role: 'user' }>, input: RunAgentInput): RunIntent {
  const parts = typeof message.content === 'string' ? [] : message.content
  return {
    kind: 'prompt',
    messageId: message.id,
    text: contentToText(message.content),
    attachments: attachmentsOf(parts),
    desktopContext: desktopContextOf(input)
  }
}

/**
 * @param handledMessageIds user messages this thread already turned into a prompt, so replaying an input
 *   (e.g. a connect after a failed run, whose messages still end with that user message) does not prompt twice.
 */
export function classifyRun(input: RunAgentInput, handledMessageIds: ReadonlySet<string>): RunIntent {
  if (input.resume && input.resume.length > 0) return { kind: 'resume', entries: input.resume }
  const action = a2uiActionOf(input.forwardedProps)
  if (action) return { kind: 'a2ui', event: action }
  const last = input.messages.at(-1)
  if (last?.role === 'user' && !handledMessageIds.has(last.id)) return promptOf(last, input)
  return { kind: 'connect' }
}
