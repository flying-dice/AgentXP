import type { AguiTerminalState } from '@shared/agui-state'
import type { ToolCallContentDto, ToolCallStatus } from '@shared/models'
import { countLineChanges } from '../../domain/line-diff'
import { blockToText } from './contentText'

const MAX_RESULT_LENGTH = 8000
const MAX_TERMINAL_OUTPUT = 4000

export interface ToolResultSource {
  status: ToolCallStatus
  contents: ToolCallContentDto[]
  /** Raw output JSON text as the agent sent it. */
  rawOutput: string | null
  terminal(terminalId: string): AguiTerminalState | undefined
}

const tail = (text: string, max: number): string => (text.length <= max ? text : `…${text.slice(text.length - max)}`)

function describeContent(content: ToolCallContentDto, terminal: ToolResultSource['terminal']): string {
  switch (content.kind) {
    case 'content':
      return blockToText(content.block)
    case 'diff': {
      const { additions, deletions } = countLineChanges(content.oldText, content.newText)
      return content.oldText === null
        ? `Created ${content.path} (+${additions})`
        : `Edited ${content.path} (+${additions} -${deletions})`
    }
    case 'terminal': {
      const state = terminal(content.terminalId)
      if (!state) return `Terminal ${content.terminalId}`
      const exit = state.exitCode === null ? '' : `\n(exit code ${state.exitCode})`
      return `$ ${state.command}\n${tail(state.output.trimEnd(), MAX_TERMINAL_OUTPUT)}${exit}`
    }
  }
}

const STATUS_FALLBACK: Partial<Record<ToolCallStatus, string>> = {
  failed: 'The tool call failed',
  cancelled: 'The tool call was cancelled'
}

/** The text of a TOOL_CALL_RESULT: contents (text, diff summary, terminal output), else the raw output, else the status. */
export function summariseToolResult(source: ToolResultSource): string {
  const parts = source.contents.map((c) => describeContent(c, source.terminal)).filter((text) => text !== '')
  const text = parts.join('\n') || source.rawOutput || STATUS_FALLBACK[source.status] || 'Done'
  return text.length <= MAX_RESULT_LENGTH ? text : `${text.slice(0, MAX_RESULT_LENGTH)}…`
}
