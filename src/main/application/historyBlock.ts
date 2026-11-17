import type { ContentBlockDto, SessionDto, TranscriptEntryDto } from '@shared/models'
import { transcriptToMarkdown } from './transcriptMarkdown'

/** URI of the prompt block that tells an agent that forgot a reopened chat what was said in it so far. */
export const HISTORY_RESOURCE_URI = 'agentxp://chat/history'

/** The most of the conversation the block carries; an older start is cut (the end is what the next message builds on). */
export const HISTORY_MAX_CHARS = 60_000

const LEAD =
  'This chat was reopened and your earlier session could not be loaded. This is the conversation so far, ' +
  'as the user saw it. Continue from it.\n\n'

/** The conversation so far as Markdown, cut at the start when it is longer than `HISTORY_MAX_CHARS`. */
export function historyText(session: SessionDto, entries: readonly TranscriptEntryDto[]): string {
  const markdown = transcriptToMarkdown(session, [...entries])
  if (markdown.length <= HISTORY_MAX_CHARS) return LEAD + markdown
  return `${LEAD}[The start of the conversation is left out.]\n\n…${markdown.slice(markdown.length - HISTORY_MAX_CHARS)}`
}

/**
 * The prompt block with the conversation so far, or null when there is none. It goes to the agent only (with the
 * first message after a reconnect that lost the agent's memory); the transcript already holds what it says.
 */
export function historyBlock(session: SessionDto, entries: readonly TranscriptEntryDto[]): ContentBlockDto | null {
  if (!entries.some((e) => e.kind === 'message')) return null
  return { kind: 'resource', uri: HISTORY_RESOURCE_URI, mimeType: 'text/markdown', text: historyText(session, entries) }
}
