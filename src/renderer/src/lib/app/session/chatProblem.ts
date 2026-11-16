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
  /** One sentence and the next step for the status bar ("The agent stopped. Click Restart, then send your message again."); no technical words. */
  status: string
}

/** True for text that only a developer reads: protocol names, error codes, process words. */
const isTechnical = (text: string): boolean => /\bACP\b|JSON-RPC|AG-UI|\bMCP\b|-32\d{3}|exit code|spawn|stack|\bat .+\(.+:\d+/i.test(text) || /\bE[A-Z]{3,}\b/.test(text)
const isTimeout = (text: string): boolean => /time(d)? ?out|ETIMEDOUT/i.test(text)

/**
 * A failure that is not about the agent program (no `session.problem`) in plain words: a timeout, a program that would not start, a
 * dropped connection, or any other technical text. The agent's own plain error ("Rate limit") is not changed.
 * `unanswered`: the message was never answered, so "Send again" is the next step.
 */
export function plainError(error: string, unanswered: boolean): { text: string; status: string } | null {
  const again = unanswered ? 'Click Send again to try again.' : 'Click Details... to read more.'
  if (isConnectionLossText(error)) {
    return unanswered
      ? { text: 'Your message could not be sent because the connection to the agent dropped.', status: `The connection to the agent dropped. ${again}` }
      : { text: 'The agent stopped before it finished.', status: `The agent stopped before it finished. ${again}` }
  }
  if (isTimeout(error)) return { text: 'The agent did not answer in time.', status: `The agent did not answer in time. ${again}` }
  if (/spawn|ENOENT|EACCES/i.test(error)) return { text: 'The agent could not start.', status: 'The agent could not start. Open Agents to check its command.' }
  if (isTechnical(error)) {
    // The agent's own sentence stays when one is left after the protocol words are taken away ("Internal error: Scripted expectation failed").
    const own = error.replace(/JSON-RPC( error)?|\bACP\b|-32\d{3}|\bInternal error\b/gi, '').replace(/^[\s:,.-]+/, '').trim()
    if (own && !isTechnical(own)) return { text: own, status: `${own} ${again}` }
    return { text: 'Something went wrong while the agent worked.', status: `Something went wrong. ${again}` }
  }
  return null
}

/** How long "The agent is running again." stays after a restart. */
export const RESTART_DONE_MS = 4000

const DETAILS: ProblemAction = { id: 'details', label: 'Details...' }
/** Not a button: the row shows it as the link in "The details are in Event Viewer." after the buttons (UX-160). */
const EVENT_VIEWER: ProblemAction = { id: 'event-viewer', label: 'Event Viewer' }

/** The recovery that works: the answer a crash box highlights (the default button), never Details or Event Viewer. */
const RECOVERY: readonly ProblemActionId[] = ['send-again', 'restart-send', 'restart']

/** The action the row highlights: the first recovery of the list; null when there is none (a plain agent error with no way to retry). */
export const defaultActionId = (actions: readonly ProblemAction[]): ProblemActionId | null => actions.find((a) => RECOVERY.includes(a.id))?.id ?? null
/** Both open Control Center > Agents: one to correct the command of the agent, one to pick another agent as the default. */
const OPEN_AGENTS: ProblemAction = { id: 'open-agents', label: 'Open Agents' }
const CHOOSE_AGENT: ProblemAction = { id: 'choose-agent', label: 'Choose another agent' }
/** With a message that was not answered, the button says its text stays in the message box. */
const newChat = (failed: unknown): ProblemAction => ({ id: 'new-chat', label: failed ? 'Start a new chat (your text is kept in the box)' : 'Start a new chat' })

export interface ProblemInput {
  /** The error of the last run (technical text), or null. */
  error: string | null
  /** What is wrong with the agent program (from the session row), or null. */
  problem: SessionProblemDto | null | undefined
  /** The send that did not go through, or null. */
  failed: Pick<FailedSend, 'unanswered'> | null
  /** The name of the desktop's default agent when it is not the agent of this chat ("Try again with Claude Code"); else null. */
  newDefaultAgent?: string | null
  /** The name of this chat's agent ("My assistant"): the start failure names it instead of "The agent". */
  agentName?: string | null
}

const lowerFirst = (text: string): string => (/^[A-Z][a-z]/.test(text) ? text[0].toLowerCase() + text.slice(1) : text)

const START_LEAD = 'The agent could not start. '

/** "The agent could not start. The program 'x' was not found." as "My assistant could not start: the program 'x' was not found." */
export function namedStartFailure(message: string, agentName: string | null | undefined): string {
  const name = agentName?.trim()
  if (!name || !message.startsWith(START_LEAD)) return message
  return `${name} could not start: ${lowerFirst(message.slice(START_LEAD.length))}`
}

/** The line a second failure in a row adds: "It stopped again: the program 'x' was not found." (The row says where the details are after its buttons.) */
export function repeatLine(problem: SessionProblemDto): string {
  const cause = lowerFirst((problem.cause ?? problem.message).trim().replace(/\.$/, ''))
  return `It stopped again: ${cause}.`
}

/**
 * The error row of a chat. The technical text (ACP, JSON-RPC, exit codes) never shows in the row, only behind
 * "Details...". A failure that is not about the agent program (the agent reported an error of its own) is shown as it came.
 * After a second failure in a row the row adds the cause and swaps "Restart and send again" for "Start a new chat", so the
 * message is not sent into the same failure over and over.
 */
export function describeProblem(input: ProblemInput): ChatProblem | null {
  const result = describeRaw(input)
  return result && { ...result, status: result.status ?? statusOf(result, input) }
}

type Raw = Omit<ChatProblem, 'status'> & { status?: string }

/** The status bar sentence of a problem of the agent program: what happened, then the first button as the next step. */
function statusOf(result: Raw, { problem, error, agentName }: ProblemInput): string {
  const first = result.actions[0]
  const again = (problem?.failures ?? 1) >= 2
  switch (problem?.kind) {
    case 'agent-stopped':
      return first?.id === 'restart-send' ? 'The agent stopped. Click Restart and send again.' : again ? 'The agent stopped again. Click Restart, or start a new chat.' : 'The agent stopped. Click Restart, then send your message again.'
    case 'agent-ended':
      return again ? 'The agent program was ended again. Click Restart, or start a new chat.' : 'The agent program was ended. Click Restart, then send your message again.'
    case 'start-failed':
      return `${namedStartFailure(problem.message, agentName).split('\n')[0].replace(/ Your message was not sent\.$/, '')} Click ${first?.label ?? 'Try again'}, or open Agents to change the command.`
    default:
      return error ?? ''
  }
}

function describeRaw({ error, problem, failed, newDefaultAgent = null, agentName = null }: ProblemInput): Raw | null {
  if (problem) {
    const detail = problem.detail || error
    const again = (problem.failures ?? 1) >= 2
    const tail = again ? `\n${repeatLine(problem)}` : ''
    switch (problem.kind) {
      case 'start-failed': {
        const retry: ProblemAction = failed ? { id: 'send-again', label: 'Send again' } : { id: 'restart', label: newDefaultAgent ? `Try again with ${newDefaultAgent}` : 'Try again' }
        return {
          text: `${failed ? `${namedStartFailure(problem.message, agentName)} Your message was not sent.` : namedStartFailure(problem.message, agentName)}${tail}`,
          detail,
          actions: [retry, OPEN_AGENTS, CHOOSE_AGENT, ...(again ? [newChat(failed), EVENT_VIEWER] : []), DETAILS]
        }
      }
      case 'agent-stopped': {
        const restart: ProblemAction = again ? { id: 'restart', label: 'Restart' } : { id: failed ? 'restart-send' : 'restart', label: failed ? 'Restart and send again' : 'Restart' }
        return { text: `${problem.message}${tail}`, detail, actions: [restart, ...(again ? [newChat(failed)] : []), DETAILS, EVENT_VIEWER] }
      }
      case 'agent-ended': {
        const restart: ProblemAction = again ? { id: 'restart', label: 'Restart' } : { id: failed ? 'restart-send' : 'restart', label: failed ? 'Restart and send again' : 'Restart' }
        return { text: `${problem.message}${tail}`, detail, actions: [restart, ...(again ? [newChat(failed), EVENT_VIEWER] : [])] }
      }
    }
  }
  if (error === null) return null
  const resend: ProblemAction[] = failed?.unanswered ? [{ id: 'send-again', label: 'Send again' }] : []
  const plain = plainError(error, !!failed?.unanswered)
  if (plain) return { ...plain, detail: error, actions: [...resend, DETAILS] }
  // An error the agent reported itself in plain words: as it came; an unanswered message can still be sent again.
  return { text: error, detail: null, actions: resend, status: error }
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
