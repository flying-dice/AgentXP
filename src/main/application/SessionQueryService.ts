import type { A2uiSurfaceDto } from '@shared/a2ui'
import type { DesktopState } from '@shared/desktop'
import type { FileChangeDto, Id, SessionDto, TaskDto, TerminalDto, TranscriptEntryDto } from '@shared/models'
import type { A2uiSurfaceRepository } from '../domain/repositories/a2ui-surface-repository'
import type { FileChangeRepository } from '../domain/repositories/file-change-repository'
import type { SessionRepository } from '../domain/repositories/session-repository'
import type { TaskRepository } from '../domain/repositories/task-repository'
import type { TerminalRepository } from '../domain/repositories/terminal-repository'
import type { TranscriptRepository } from '../domain/repositories/transcript-repository'
import type { DesktopStates } from './desktop/ports'
import { required } from './errors'

/** Read side of sessions: lists and per-session collections. */
export class SessionQueryService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly transcripts: TranscriptRepository,
    private readonly tasks: TaskRepository,
    private readonly changes: FileChangeRepository,
    private readonly terminals: TerminalRepository,
    private readonly surfaces: A2uiSurfaceRepository,
    private readonly desktops?: Pick<DesktopStates, 'stateOfSession'>
  ) {}

  list(desktopId?: Id): SessionDto[] {
    return this.sessions.list(desktopId)
  }

  get(id: Id): SessionDto {
    return required(this.sessions.get(id), 'Session')
  }

  transcript(id: Id): TranscriptEntryDto[] {
    return this.transcripts.list(this.get(id).id)
  }

  tasksOf(id: Id): TaskDto[] {
    return this.tasks.list(this.get(id).id)
  }

  changesOf(id: Id): FileChangeDto[] {
    return this.changes.list(this.get(id).id)
  }

  terminalsOf(id: Id): TerminalDto[] {
    return this.terminals.list(this.get(id).id)
  }

  surfacesOf(id: Id): A2uiSurfaceDto[] {
    return this.surfaces.list(this.get(id).id)
  }

  desktopOf(id: Id): DesktopState | null {
    return this.desktops?.stateOfSession(this.get(id).id) ?? null
  }
}
