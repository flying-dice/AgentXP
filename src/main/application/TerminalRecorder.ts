import type { Id } from '@shared/models'
import type { TerminalRepository } from '../domain/repositories/terminal-repository'
import type { EventPublisher, TerminalActivity } from './ports'

/** Mirrors agent terminal activity into the repository and publishes `terminal.changed`. */
export class TerminalRecorder {
  constructor(
    private readonly terminals: TerminalRepository,
    private readonly events: EventPublisher
  ) {}

  record(sessionId: Id, activity: TerminalActivity): void {
    const { terminalId } = activity
    if (!this.terminals.get(sessionId, terminalId)) {
      this.terminals.create({
        sessionId,
        terminalId,
        command: activity.command,
        args: activity.args,
        cwd: activity.cwd
      })
    }
    if (activity.delta) this.terminals.appendOutput(sessionId, terminalId, activity.delta)
    const { exitStatus } = activity
    const dto = exitStatus
      ? this.terminals.setExit(sessionId, terminalId, exitStatus.exitCode, exitStatus.signal)
      : this.terminals.get(sessionId, terminalId)
    if (dto) this.events.publish('terminal.changed', dto)
  }
}
