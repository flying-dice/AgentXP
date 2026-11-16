import { isDesktopBlock } from './desktop/desktopBlock'
import type { ContentBlockDto, SessionDto, ToolCallContentDto, TranscriptEntryDto } from '@shared/models'

const blockText = (block: ContentBlockDto): string => {
  switch (block.kind) {
    case 'text':
      return block.text
    case 'image':
      return `[image: ${block.mimeType}]`
    case 'resource_link':
      return `[${block.name}](${block.uri})`
    case 'resource':
      return block.text ?? `[resource: ${block.uri}]`
  }
}

/** The desktop state block is plumbing, not part of what the user wrote. */
const blocksText = (blocks: ContentBlockDto[]): string => blocks.filter((b) => !isDesktopBlock(b)).map(blockText).join('\n\n')

const ROLE_HEADINGS = { user: 'You', agent: 'Agent', thought: 'Agent (thinking)' } as const

const fence = (text: string, lang = ''): string => `\`\`\`${lang}\n${text.trimEnd()}\n\`\`\``

const toolContent = (content: ToolCallContentDto): string | null => {
  switch (content.kind) {
    case 'content':
      return blockText(content.block)
    case 'diff':
      return `Edited \`${content.path}\``
    case 'terminal':
      return null
  }
}

const entryMarkdown = (entry: TranscriptEntryDto): string => {
  switch (entry.kind) {
    case 'message':
      return `### ${ROLE_HEADINGS[entry.role]}\n\n${blocksText(entry.blocks)}`
    case 'tool_call': {
      const details = entry.contents.map(toolContent).filter((t): t is string => t !== null)
      return [`#### Tool: ${entry.title || entry.toolKind} (${entry.status})`, ...details.map((d) => fence(d))].join('\n\n')
    }
    case 'a2ui':
      return `_Interactive surface: ${entry.surfaceId}_`
  }
}

/** Renders a session transcript as Markdown. */
export function transcriptToMarkdown(session: SessionDto, entries: TranscriptEntryDto[]): string {
  return [`# ${session.title}`, ...entries.map(entryMarkdown)].join('\n\n') + '\n'
}

/** A file name safe on every platform, derived from the session title. */
export function exportFileName(title: string): string {
  const base = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(0, 60)
  return `${base || 'session'}.md`
}
