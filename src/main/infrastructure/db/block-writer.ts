import type { Database, Statement } from 'better-sqlite3'
import type { ContentBlockDto } from '@shared/models'
import { blockToRow, type BlockRow } from './content-block-mapper'

export type BlockOwner = { messageId: number } | { toolContentId: number }

interface InsertParams extends BlockRow {
  message_id: number | null
  tool_content_id: number | null
  position: number
}

/** Inserts content blocks for either owner kind. */
export class BlockWriter {
  private readonly insert: Statement<InsertParams>

  constructor(db: Database) {
    this.insert = db.prepare(
      `INSERT INTO content_blocks (message_id, tool_content_id, position, kind, text, mime_type, uri, name, data)
       VALUES (@message_id, @tool_content_id, @position, @kind, @text, @mime_type, @uri, @name, @data)`
    )
  }

  write(owner: BlockOwner, position: number, block: ContentBlockDto): void {
    this.insert.run({
      ...blockToRow(block),
      message_id: 'messageId' in owner ? owner.messageId : null,
      tool_content_id: 'toolContentId' in owner ? owner.toolContentId : null,
      position
    })
  }
}
