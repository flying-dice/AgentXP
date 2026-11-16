/** Reads what a script needs from an ACP prompt: its text and the desktop-state resource. */
import type { ContentBlock } from '@agentclientprotocol/sdk'

export const DESKTOP_RESOURCE_URI = 'agent7://desktop/state'

export interface ParsedPrompt {
  /** The text blocks, joined with newlines. Resources and images do not take part in matching. */
  text: string
  /** The text of the `agent7://desktop/state` resource; empty when the prompt has none. */
  desktop: string
}

export function parsePrompt(blocks: readonly ContentBlock[]): ParsedPrompt {
  const texts: string[] = []
  let desktop = ''
  for (const block of blocks) {
    if (block.type === 'text') texts.push(block.text)
    else if (block.type === 'resource' && block.resource.uri === DESKTOP_RESOURCE_URI && 'text' in block.resource) desktop = block.resource.text
  }
  return { text: texts.join('\n'), desktop }
}
