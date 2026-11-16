import { DESKTOP_RESOURCE_URI } from '@shared/desktop'
import type { ContentBlockDto } from '@shared/models'

/** The prompt block that tells the agent what is on its desktop (state as JSON). */
export const desktopBlock = (json: string): ContentBlockDto => ({
  kind: 'resource',
  uri: DESKTOP_RESOURCE_URI,
  mimeType: 'application/json',
  text: json
})

/** The desktop block is plumbing: stored with the prompt, never shown as something the user typed. */
export const isDesktopBlock = (block: ContentBlockDto): boolean => block.kind === 'resource' && block.uri === DESKTOP_RESOURCE_URI
