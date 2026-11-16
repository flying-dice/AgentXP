import type { ContentBlockDto } from '@shared/models'

/** Columns of `content_blocks` that describe the block itself (not its owner). */
export const BLOCK_COLUMNS = 'kind, text, mime_type, uri, name, data'

export interface BlockRow {
  kind: ContentBlockDto['kind']
  text: string | null
  mime_type: string | null
  uri: string | null
  name: string | null
  data: Uint8Array | null
}

export function blockToRow(block: ContentBlockDto): BlockRow {
  switch (block.kind) {
    case 'text':
      return { kind: 'text', text: block.text, mime_type: null, uri: null, name: null, data: null }
    case 'image':
      return {
        kind: 'image',
        text: null,
        mime_type: block.mimeType,
        uri: block.uri,
        name: null,
        data: Buffer.from(block.data, 'base64')
      }
    case 'resource_link':
      return { kind: 'resource_link', text: null, mime_type: block.mimeType, uri: block.uri, name: block.name, data: null }
    case 'resource':
      return { kind: 'resource', text: block.text, mime_type: block.mimeType, uri: block.uri, name: null, data: null }
  }
}

export function rowToBlock(row: BlockRow): ContentBlockDto {
  switch (row.kind) {
    case 'text':
      return { kind: 'text', text: row.text ?? '' }
    case 'image':
      return { kind: 'image', mimeType: row.mime_type ?? '', data: Buffer.from(row.data ?? new Uint8Array()).toString('base64'), uri: row.uri }
    case 'resource_link':
      return { kind: 'resource_link', uri: row.uri ?? '', name: row.name ?? '', mimeType: row.mime_type }
    case 'resource':
      return { kind: 'resource', uri: row.uri ?? '', mimeType: row.mime_type, text: row.text }
  }
}
