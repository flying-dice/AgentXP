import type { ContentBlockDto } from '@shared/models'

/** URI of the prompt block that carries the briefing (instructions and skills) of a session. */
export const BRIEFING_RESOURCE_URI = 'agent7://briefing'

/** The first prompt of a session carries what the agent should know about its role and skills. */
export const briefingBlock = (text: string): ContentBlockDto => ({ kind: 'resource', uri: BRIEFING_RESOURCE_URI, mimeType: 'text/markdown', text })

/** The briefing is plumbing: stored with the prompt, never shown as something the user typed. */
export const isBriefingBlock = (block: ContentBlockDto): boolean => block.kind === 'resource' && block.uri === BRIEFING_RESOURCE_URI
