import type { ContentBlock } from '@agentclientprotocol/sdk'
import type { ContentBlockDto } from '@shared/models'

/** ACP content block to harness DTO. Audio has no DTO; it becomes a text placeholder. */
export function toContentBlockDto(block: ContentBlock): ContentBlockDto {
  switch (block.type) {
    case 'text':
      return { kind: 'text', text: block.text }
    case 'image':
      return { kind: 'image', mimeType: block.mimeType, data: block.data, uri: block.uri ?? null }
    case 'resource_link':
      return { kind: 'resource_link', uri: block.uri, name: block.name, mimeType: block.mimeType ?? null }
    case 'resource': {
      const resource = block.resource
      return {
        kind: 'resource',
        uri: resource.uri,
        mimeType: resource.mimeType ?? null,
        text: 'text' in resource ? resource.text : null
      }
    }
    default:
      return { kind: 'text', text: `[${block.type} content]` }
  }
}

/** Harness DTO to ACP content block (for prompts). */
export function toAcpContentBlock(block: ContentBlockDto): ContentBlock {
  switch (block.kind) {
    case 'text':
      return { type: 'text', text: block.text }
    case 'image':
      return { type: 'image', mimeType: block.mimeType, data: block.data, uri: block.uri }
    case 'resource_link':
      return { type: 'resource_link', uri: block.uri, name: block.name, mimeType: block.mimeType }
    case 'resource':
      if (block.text === null) return { type: 'resource_link', uri: block.uri, name: block.uri, mimeType: block.mimeType }
      return { type: 'resource', resource: { uri: block.uri, mimeType: block.mimeType, text: block.text } }
  }
}
