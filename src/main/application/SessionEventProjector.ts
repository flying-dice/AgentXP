import type { Id, TranscriptEntryDto } from '@shared/models'
import type { AgentSessionEvent } from '../domain/agent/AgentSessionEvent'
import type { SessionRepository } from '../domain/repositories/session-repository'
import type { TaskRepository } from '../domain/repositories/task-repository'
import type { TranscriptRepository } from '../domain/repositories/transcript-repository'
import type { EventPublisher } from './ports'
import type { SessionBroadcaster } from './SessionBroadcaster'

/** Applies normalised agent events to the repositories and tells the renderer. */
export class SessionEventProjector {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly transcripts: TranscriptRepository,
    private readonly tasks: TaskRepository,
    private readonly events: EventPublisher,
    private readonly broadcaster: SessionBroadcaster
  ) {}

  apply(sessionId: Id, event: AgentSessionEvent): void {
    switch (event.type) {
      case 'message_chunk':
        return this.publishEntry(sessionId, this.transcripts.appendChunk(sessionId, event.role, event.block).entry)
      case 'tool_call_created': {
        const { type: _type, ...call } = event
        return this.publishEntry(sessionId, this.transcripts.upsertToolCall(sessionId, call).entry)
      }
      case 'tool_call_updated':
        return this.publishEntry(
          sessionId,
          this.transcripts.upsertToolCall(sessionId, { toolCallId: event.toolCallId, ...event.patch }).entry
        )
      case 'plan_replaced':
        return this.events.publish('tasks.changed', {
          sessionId,
          tasks: this.tasks.replace(sessionId, event.entries)
        })
      case 'mode_changed':
        return this.updateSession(sessionId, () => this.sessions.setCurrentMode(sessionId, event.modeId))
      case 'commands_updated':
        return this.updateSession(sessionId, () => this.sessions.replaceCommands(sessionId, event.commands))
      case 'usage_updated':
        return this.updateSession(sessionId, () =>
          this.sessions.setUsage(sessionId, event.contextUsed, event.contextSize)
        )
      case 'session_info_updated':
        return this.renameFromAgent(sessionId, event.title)
    }
  }

  private publishEntry(sessionId: Id, entry: TranscriptEntryDto): void {
    this.events.publish('transcript.upserted', { sessionId, entry })
  }

  /** The agent proposes a title; clearing it keeps the current one. */
  private renameFromAgent(sessionId: Id, title: string | null): void {
    if (title) this.updateSession(sessionId, () => this.sessions.rename(sessionId, title))
  }

  private updateSession(sessionId: Id, write: () => void): void {
    write()
    this.broadcaster.refresh(sessionId)
  }
}
