import type { ContentBlockDto } from '@shared/models'

/** AG-UI text carries text only; other blocks are described in one short line. */
export function blockToText(block: ContentBlockDto): string {
  switch (block.kind) {
    case 'text':
      return block.text
    case 'image':
      return '[image]'
    case 'resource_link':
      return `[${block.name}](${block.uri})`
    case 'resource':
      return block.text ?? block.uri
  }
}

export const blocksToText = (blocks: ContentBlockDto[]): string => blocks.map(blockToText).join('')
