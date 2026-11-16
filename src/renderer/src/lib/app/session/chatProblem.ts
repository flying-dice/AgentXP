import type { ProtocolEventDto } from '@shared/desktop'
import { isConnectionLossText } from '@shared/connectionLoss'
import type { SessionProblemDto } from '@shared/models'
import type { FailedSend } from '../../agui/SessionAgentStore.svelte'

/** What a button of the error row does (the hosts of `SessionView` carry them out). */
export type ProblemActionId = 'send-again' | 'restart-send' | 'restart' | 'details' | 'event-viewer' | 'open-agents' | 'choose-agent' | 'new-chat'

export interface ProblemAction {
  id: ProblemActionId
  label: string
}

/** What the chat shows when something went wrong: plain words, the buttons that fix it, the technical text behind "Details...". */
export interface ChatProblem {
  text: string
  /** The technical text for "Details..."; null when there is nothing more to say. */
  detail: string | null
  actions: ProblemAction[]
}

/** How long "The agent is running again." stays after a restart. */
export const RESTART_DONE_MS = 4000

const DETAILS: ProblemAction = { id: 'details', label: 'Details...' }
const EVENT_VIEWER: ProblemAction = { id: 'event-viewer', label: 'Show in Event Viewer' }
/** Both open Control Center > Agents: one to correct the command of the agent, one to pick another agent as the default. */
const OPEN_AGENTS: ProblemAction = { id: 'open-agents', label: 'Open Agents' }
const CHOOSE_AGENT: ProblemAction = { id: 'choose-agent', label: 'Choose another agent' }
const NEW_CHAT: ProblemAction = { id: 'new-chat', label: 'Start a new chat' }

export interface ProblemInput {
  /** The error of the last run (technical text), or null. */
  error: string | null
  /** What is wrong with the agent program (from the session row), or null. */
  problem: SessionProblemDto | null | undefined
  /** The send that did not go through, or null. */
  failed: Pick<FailedSend, 'unanswered'> | null
  /** The name of the desktop's default agent when it is not the agent of this chat ("Try again with Claude Code"); else null. */
  newDefaultAgent?: string | null
}

const lowerFirst = (text: string): string => (/^[A-Z][a-z]/.test(text) ? text[0].toLowerCase() + text.slice(1) : text)

/** The line a second failure in a row adds: "It stopped again: the program 'x' was not found. Show in Event Viewer shows the details." */
export function repeatLine(problem: SessionProblemDto): string {
  const cause = lowerFirst((problem.cause ?? problem.message).trim().replace(/\.$/, ''))
  return `It stopped again: ${cause}. Show in Event Viewer shows the details.`
}

/**
 * The error row of a chat. The technical text (ACP, JSON-RPC, exit codes) never shows in the row, only behind
 * "Details...". A failure that is not about the agent program (the agent reported an error of its own) is shown as it came.
 * After a second failure in a row the row adds the cause and swaps "Restart and send again" for "Start a new chat", so the
 * message is not sent into the same failure over and over.
 */
export function describeProblem({ error, problem, failed, newDefaultAgent = null }: ProblemInput): ChatProblem | null {
  if (problem) {
    const detail = problem.detail || error
    const again = (problem.failures ?? 1) >= 2
    const tail = again ? `\n${repeatLine(problem)}` : ''
    switch (problem.kind) {
      case 'start-failed': {
        const retry: ProblemAction = failed ? { id: 'send-again', label: 'Send again' } : { id: 'restart', label: newDefaultAgent ? `Try again with ${newDefaultAgent}` : 'Try again' }
        return {
          text: `${failed ? `${problem.message} Your message was not sent.` : problem.message}${tail}`,
          detail,
          actions: [retry, OPEN_AGENTS, CHOOSE_AGENT, ...(again ? [NEW_CHAT, EVENT_VIEWER] : []), DETAILS]
        }
      }
      case 'agent-stopped': {
        const restart: ProblemAction = again ? { id: 'restart', label: 'Restart' } : { id: failed ? 'restart-send' : 'restart', label: failed ? 'Restart and send again' : 'Restart' }
        return { text: `${problem.message}${tail}`, detail, actions: [restart, ...(again ? [NEW_CHAT] : []), DETAILS, EVENT_VIEWER] }
      }
      case 'agent-ended': {
        const restart: ProblemAction = again ? { id: 'restart', label: 'Restart' } : { id: failed ? 'restart-send' : 'restart', label: failed ? 'Restart and send again' : 'Restart' }
        return { text: `${problem.message}${tail}`, detail, actions: [restart, ...(again ? [NEW_CHAT, EVENT_VIEWER] : [])] }
      }
    }
  }
  if (error === null) return null
  if (failed?.unanswered && isConnectionLossText(error)) {
    return { text: 'Your message could not be sent because the connection to the agent dropped.', detail: error, actions: [{ id: 'send-again', label: 'Send again' }, DETAILS] }
  }
  // An error the agent reported itself: its words as they came; an unanswered message can still be sent again.
  return { text: error, detail: null, actions: failed?.unanswered ? [{ id: 'send-again', label: 'Send again' }] : [] }
}

/** How the user's message looks in the transcript: normal, "Not sent" (never answered) or "Stopped" (answered halfway). */
export type SendState = 'sent' | 'not-sent' | 'stopped'

export function sendStateOf(messageId: string, failed: (Pick<FailedSend, 'messageId' | 'unanswered'>) | null, hasProblem: boolean): SendState {
  if (!failed || failed.messageId !== messageId || !hasProblem) return 'sent'
  return failed.unanswered ? 'not-sent' : 'stopped'
}

/** The text of "Details...": the technical message, then the last lines of the log. */
export function problemDetails(detail: string | null, log: readonly string[]): string {
  const lines = log.length > 0 ? `\n\nLast lines of the log:\n${log.join('\n')}` : ''
  return `${detail ?? 'There is nothing more to show.'}${lines}`
}

/** The last lines of a chat's protocol log, one short line each ("10:42:07 ACP session/prompt"), oldest first. */
export function logLines(events: readonly Pick<ProtocolEventDto, 'at' | 'source' | 'name' | 'level'>[], count = 6): string[] {
  const source = { acp: 'ACP', 'ag-ui': 'AG-UI', mcp: 'MCP' } as const
  return events.slice(-count).map((e) => `${e.at.slice(11, 19)} ${source[e.source]} ${e.name}${e.level === 'info' ? '' : ` (${e.level})`}`)
}
