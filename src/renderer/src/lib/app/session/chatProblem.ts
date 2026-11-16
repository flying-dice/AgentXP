import type { ProtocolEventDto } from '@shared/desktop'
import { isConnectionLossText } from '@shared/connectionLoss'
import type { SessionProblemDto } from '@shared/models'
import type { FailedSend } from '../../agui/SessionAgentStore.svelte'

/** What a button of the error row does (the hosts of `SessionView` carry them out). */
export type ProblemActionId = 'send-again' | 'restart-send' | 'restart' | 'details' | 'event-viewer'

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

const DETAILS: ProblemAction = { id: 'details', label: 'Details...' }
const EVENT_VIEWER: ProblemAction = { id: 'event-viewer', label: 'Show in Event Viewer' }

export interface ProblemInput {
  /** The error of the last run (technical text), or null. */
  error: string | null
  /** What is wrong with the agent program (from the session row), or null. */
  problem: SessionProblemDto | null | undefined
  /** The send that did not go through, or null. */
  failed: Pick<FailedSend, 'unanswered'> | null
}

/**
 * The error row of a chat. The technical text (ACP, JSON-RPC, exit codes) never shows in the row, only behind
 * "Details...". A failure that is not about the agent program (the agent reported an error of its own) is shown as it came.
 */
export function describeProblem({ error, problem, failed }: ProblemInput): ChatProblem | null {
  if (problem) {
    const detail = problem.detail || error
    switch (problem.kind) {
      case 'start-failed':
        return {
          text: failed ? `${problem.message} Your message was not sent.` : problem.message,
          detail,
          actions: failed ? [{ id: 'send-again', label: 'Send again' }, DETAILS] : [{ id: 'restart', label: 'Try again' }, DETAILS]
        }
      case 'agent-stopped':
        return {
          text: problem.message,
          detail,
          actions: [{ id: failed ? 'restart-send' : 'restart', label: failed ? 'Restart and send again' : 'Restart' }, DETAILS, EVENT_VIEWER]
        }
      case 'agent-ended':
        return { text: problem.message, detail, actions: [{ id: failed ? 'restart-send' : 'restart', label: failed ? 'Restart and send again' : 'Restart' }] }
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
