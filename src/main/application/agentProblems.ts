import type { SessionProblemDto } from '@shared/models'
import { isConnectionLossText } from '@shared/connectionLoss'
import { AppError } from './errors'

/** The agent program of a chat, as far as an error message needs it. */
export interface AgentProgram {
  name: string
  command: string
}

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/** The program name for a message: the file name of the command, without a folder. */
const programName = (command: string): string => command.trim().split(/[\\/]/).pop() || command

/**
 * The problem of an agent that could not be started: plain words for the user (no protocol names), the raw
 * error for "Details...". "not found" is by far the most common cause (a wrong command in Control Center > Agents).
 */
export function startFailure(error: unknown, agent: AgentProgram): SessionProblemDto {
  const detail = messageOf(error)
  const program = programName(agent.command)
  let reason: string
  if (error instanceof AppError) reason = detail // our own readable message (an ejected drive, a missing folder)
  else if (/ENOENT|not found|no such file/i.test(detail)) reason = `The program '${program}' was not found.`
  else if (/EACCES|EPERM|permission denied/i.test(detail)) reason = `The program '${program}' could not be run because Windows did not allow it.`
  else reason = `The program '${program}' stopped before it was ready.`
  return { kind: 'start-failed', message: `The agent could not start. ${reason}`, detail }
}

/** A running agent whose connection dropped in the middle of a turn. */
export function stoppedUnexpectedly(error: unknown): SessionProblemDto {
  return { kind: 'agent-stopped', message: 'The agent stopped unexpectedly. Your request was not finished.', detail: messageOf(error) }
}

/** The user (Task Manager) ended the agent program. */
export function endedByUser(): SessionProblemDto {
  return { kind: 'agent-ended', message: 'The agent program was stopped.', detail: 'The agent process was ended from Task Manager.' }
}

/** True when a failed turn failed because the agent connection went away (as opposed to an error the agent reported). */
export const isConnectionLoss = (error: unknown): boolean => isConnectionLossText(messageOf(error))
