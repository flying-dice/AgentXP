import type { ProtocolEventDto } from '@shared/desktop'
import { isConnectionLossText } from '@shared/connectionLoss'
import type { SessionProblemDto } from '@shared/models'
import type { FailedSend } from '../../agui/SessionAgentStore.svelte'

/** What a button of the error row does (the hosts of `SessionView` carry them out). */
export type ProblemActionId = 'send-again' | 'restart-send' | 'restart' | 'details' | 'event-viewer' | 'open-agents' | 'choose-agent' | 'new-chat'

export interface ProblemAction {
  id: ProblemActionId
  label: string
  /** The row highlights this button, whatever the list order (UX-174: "Choose another agent" for a program that is not there). */
  primary?: boolean
}

/** What the chat shows when something went wrong: plain words, the buttons that fix it, the technical text behind "Details...". */
export interface ChatProblem {
  text: string
  /** The technical text for "Details..."; null when there is nothing more to say. */
  detail: string | null
  actions: ProblemAction[]
  /** One sentence and the next step for the status bar ("The agent stopped. Click Restart, then send your message again."); no technical words. */
  status: string
  /** Something the user did or asked for (ending the agent program): a plain notice, not a red error (UX-201). */
  notice?: boolean
}

/** True for text that only a developer reads: protocol names, error codes, process words. */
const isTechnical = (text: string): boolean => /\bACP\b|JSON-RPC|AG-UI|\bMCP\b|-32\d{3}|exit code|spawn|stack|\bat .+\(.+:\d+/i.test(text) || /\bE[A-Z]{3,}\b/.test(text)
const isTimeout = (text: string): boolean => /time(d)? ?out|ETIMEDOUT/i.test(text)

/** A step of the agent's own work that timed out ("Timed out after 5183 ms waiting for ..."), not a request that got no answer. */
const isStepTimeout = (text: string): boolean => /time(d)? ?out after \d+ ?(ms|s)\b.*waiting for|waiting for .*time(d)? ?out/i.test(text)
/** What the step waited for, in plain words ("the page"), or null when the text does not say. */
const stepWaitsFor = (text: string): string | null => (/page|browser|selector|navigat|element|"/i.test(text) ? 'the page' : null)

/**
 * A failure that is not about the agent program (no `session.problem`) in plain words: a timeout, a program that would not start, a
 * dropped connection, or any other technical text. The agent's own plain error ("Rate limit") is not changed.
 * `unanswered`: the message was never answered. `failed`: a message of this chat failed, so "Send again" is the next step, also when
 * the agent had started on it (UX-195). `status` is the short sentence for the status bar: it fits its field.
 */
export function plainError(error: string, unanswered: boolean, failed = unanswered): { text: string; status: string } | null {
  // The box says what to do next only when there is something to send again (the button is there).
  const next = failed ? ' Click Send again to try again.' : ''
  const short = failed ? ' Click Send again.' : ' Click Details...'
  if (isConnectionLossText(error)) {
    return unanswered
      ? { text: `Your message could not be sent because the connection to the agent dropped.${next}`, status: `Connection dropped.${short}` }
      : { text: `The agent stopped before it finished.${next}`, status: `The agent stopped.${short}` }
  }
  if (isTimeout(error)) {
    if (isStepTimeout(error)) {
      const waits = stepWaitsFor(error)
      return { text: `A step took too long${waits ? ` (waiting for ${waits})` : ''}.${next}`, status: `A step took too long.${short}` }
    }
    // A message that was answered with steps and then stopped did not "get no answer": it stopped before it finished.
    return unanswered || !failed
      ? { text: `The agent did not answer in time.${next}`, status: `No answer in time.${short}` }
      : { text: `The agent stopped before it finished.${next}`, status: `The agent stopped.${short}` }
  }
  if (/spawn|ENOENT|EACCES/i.test(error)) return { text: 'The agent could not start.', status: 'The agent could not start. Open Agents to check its command.' }
  if (isTechnical(error)) {
    // The agent's own sentence stays when one is left after the protocol words are taken away ("Internal error: Scripted expectation failed").
    const own = error.replace(/JSON-RPC( error)?|\bACP\b|-32\d{3}|\bInternal error\b/gi, '').replace(/^[\s:,.-]+/, '').trim()
    if (own && !isTechnical(own)) return { text: `${own}${next}`, status: `${own}${short}` }
    return { text: `Something went wrong while the agent worked.${next}`, status: `Something went wrong.${short}` }
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

/** The action the row highlights: the one marked `primary`, else the first recovery of the list; null when there is none (a plain agent error with no way to retry). */
export const defaultActionId = (actions: readonly ProblemAction[]): ProblemActionId | null => (actions.find((a) => a.primary) ?? actions.find((a) => RECOVERY.includes(a.id)))?.id ?? null
/** Both open Control Center > Agents: one to correct the command of the agent, one to pick another agent as the default. */
const OPEN_AGENTS: ProblemAction = { id: 'open-agents', label: 'Open Agents' }
const CHOOSE_AGENT: ProblemAction = { id: 'choose-agent', label: 'Choose another agent' }
/** With a message that was not answered, the button says its text goes with the user: the new chat opens with it in its message box (UX-175). */
const newChat = (failed: unknown): ProblemAction => ({ id: 'new-chat', label: failed ? 'Start a new chat with your text' : 'Start a new chat' })

/** The sentence under a failed start that says what to do next, by cause (UX-174); empty for a cause that has no better advice. */
export function startNextStep(problem: Pick<SessionProblemDto, 'cause' | 'message'>): string {
  const cause = problem.cause ?? problem.message
  if (/was not found/i.test(cause)) return 'Check the command in Agents, or choose another agent.'
  if (/stopped before it was ready/i.test(cause)) return 'Check that it is installed, or choose another agent.'
  return ''
}

/** A program that is not there is not fixed by trying again, and neither is any start that failed twice: then "Choose another agent" is the default (UX-174). */
export const chooseAgentFirst = (problem: Pick<SessionProblemDto, 'cause' | 'message' | 'failures'>): boolean => /was not found/i.test(problem.cause ?? problem.message) || (problem.failures ?? 1) >= 2

/** The line above the technical part of Details, and its label (UX-196). */
const DETAILS_RULE = '------------------------------'
export const TECHNICAL_HEADING = 'Technical details'

/**
 * The text for "Details...": the plain sentence of the box first, then `hint` (what to do) when there is one, then the technical
 * text below a rule under the label "Technical details". It never starts with "Internal error" or a protocol line (UX-174, UX-196).
 */
export function detailWithLead(text: string, detail: string | null, hint?: string): string {
  const lead = text.split('\n')[0]
  const plain = hint ? `${lead}\n${hint}` : lead
  return detail === null || detail === lead ? plain : `${plain}\n\n${DETAILS_RULE}\n${TECHNICAL_HEADING}\n${detail}`
}

/** What to do after a program that would not start, the second line of its Details. */
const START_FAILED_HINT = 'What to do: open Agents and choose another agent.'

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

/** The notice after the user ended the agent program (Task Manager): what happened and the one thing to do. */
export const ENDED_TEXT = 'You ended the agent program. Click Restart to use the chat again.'
/** Why Send is off after the user ended the agent program (the tooltip of the button). */
export const ENDED_SEND_OFF = 'The agent program is ended. Click Restart in the chat first.'

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
      return again ? 'You ended the agent program again. Click Restart, or start a new chat.' : 'You ended the agent program. Click Restart.'
    case 'start-failed':
      return `${startHeadline(problem, agentName)} ${startNextStep(problem) || 'Open Agents to change the command, or choose another agent.'}`
    default:
      return error ?? ''
  }
}

/** The first sentence of a failed start: "My assistant could not start: the program 'x' was not found.", or after a change of the default agent. */
function startHeadline(problem: SessionProblemDto, agentName: string | null | undefined): string {
  if (problem.agentChanged && problem.agentName) return `The default agent is now ${problem.agentName}. It could not start either.`
  return namedStartFailure(problem.message, agentName)
}

function describeRaw({ error, problem, failed, newDefaultAgent = null, agentName = null }: ProblemInput): Raw | null {
  if (problem) {
    const again = (problem.failures ?? 1) >= 2
    const tail = again && !problem.agentChanged ? `\n${repeatLine(problem)}` : ''
    const withLead = (text: string, hint?: string): { text: string; detail: string | null } => ({ text, detail: detailWithLead(text, problem.detail || error, hint) })
    switch (problem.kind) {
      case 'start-failed': {
        const retry: ProblemAction = failed ? { id: 'send-again', label: 'Send again' } : { id: 'restart', label: newDefaultAgent ? `Try again with ${newDefaultAgent}` : 'Try again' }
        const choose: ProblemAction = chooseAgentFirst(problem) ? { ...CHOOSE_AGENT, primary: true } : CHOOSE_AGENT
        const extra = again ? [newChat(failed), EVENT_VIEWER] : []
        const cause = problem.agentChanged && problem.cause ? ` ${problem.cause}` : ''
        const next = startNextStep(problem)
        const sentence = `${startHeadline(problem, agentName)}${cause}${next ? ` ${next}` : ''}${failed ? ' Your message was not sent.' : ''}${tail}`
        return {
          ...withLead(sentence, START_FAILED_HINT),
          actions: choose.primary ? [choose, retry, OPEN_AGENTS, ...extra, DETAILS] : [retry, OPEN_AGENTS, choose, ...extra, DETAILS]
        }
      }
      case 'agent-stopped': {
        const restart: ProblemAction = again ? { id: 'restart', label: 'Restart' } : { id: failed ? 'restart-send' : 'restart', label: failed ? 'Restart and send again' : 'Restart' }
        return { ...withLead(`${problem.message}${tail}`), actions: [restart, ...(again ? [newChat(failed)] : []), DETAILS, EVENT_VIEWER] }
      }
      case 'agent-ended': {
        // The user ended the program: a plain notice, not a red error. Restart only starts it; nothing is sent again (UX-201).
        const text = `${ENDED_TEXT}${tail}`
        return { ...withLead(text), notice: true, actions: [{ id: 'restart', label: 'Restart' }, ...(again ? [newChat(failed), EVENT_VIEWER] : [])] }
      }
    }
  }
  if (error === null) return null
  // Any failed message can be sent again, also one the agent had started on (UX-195).
  const resend: ProblemAction[] = failed ? [{ id: 'send-again', label: 'Send again' }] : []
  const plain = plainError(error, !!failed?.unanswered, !!failed)
  if (plain) return { ...plain, detail: detailWithLead(plain.text, error), actions: [...resend, DETAILS] }
  // An error the agent reported itself in plain words: as it came; an unanswered message can still be sent again.
  return { text: error, detail: null, actions: resend, status: error }
}

/** How the user's message looks in the transcript: normal, "Not sent" (never answered) or "Stopped" (answered halfway). */
export type SendState = 'sent' | 'not-sent' | 'stopped' | 'sent-again'

/** Which messages of a cut-off turn were sent again: the first one is "Stopped", the repeat "Sent again" (UX-201). */
export interface RepeatMarks {
  stoppedIds?: ReadonlySet<string>
  resentIds?: ReadonlySet<string>
}

export function sendStateOf(messageId: string, failed: (Pick<FailedSend, 'messageId' | 'unanswered'>) | null, hasProblem: boolean, marks: RepeatMarks = {}): SendState {
  if (failed && failed.messageId === messageId && hasProblem) return failed.unanswered ? 'not-sent' : 'stopped'
  if (marks.stoppedIds?.has(messageId)) return 'stopped'
  return marks.resentIds?.has(messageId) ? 'sent-again' : 'sent'
}

/** The text of "Details...": the technical message, then the last lines of the log. */
export function problemDetails(detail: string | null, log: readonly string[]): string {
  const head = detail ?? 'There is nothing more to show.'
  if (log.length === 0) return head
  const lines = `Last lines of the log:\n${log.join('\n')}`
  // The log is technical: under the heading, whether the text had one or not.
  return head.includes(TECHNICAL_HEADING) ? `${head}\n\n${lines}` : `${head}\n\n${DETAILS_RULE}\n${TECHNICAL_HEADING}\n${lines}`
}

/** The last lines of a chat's protocol log, one short line each ("10:42:07 ACP session/prompt"), oldest first. */
export function logLines(events: readonly Pick<ProtocolEventDto, 'at' | 'source' | 'name' | 'level'>[], count = 6): string[] {
  const source = { acp: 'ACP', 'ag-ui': 'AG-UI', mcp: 'MCP' } as const
  return events.slice(-count).map((e) => `${e.at.slice(11, 19)} ${source[e.source]} ${e.name}${e.level === 'info' ? '' : ` (${e.level})`}`)
}
