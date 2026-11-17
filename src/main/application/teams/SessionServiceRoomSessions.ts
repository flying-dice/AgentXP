import type { ContentBlockDto, Id, SessionDto } from '@shared/models'
import type { SessionRepository } from '../../domain/repositories/session-repository'
import type { TranscriptRepository } from '../../domain/repositories/transcript-repository'
import type { SessionService } from '../SessionService'
import type { RoomSessions } from './ports'

const textOf = (blocks: ContentBlockDto[]): string =>
  blocks.flatMap((b) => (b.kind === 'text' ? [b.text] : [])).join('').trim()

/** Room sessions on top of `SessionService`: members are `aside` sessions (hidden from the chat lists). */
export class SessionServiceRoomSessions implements RoomSessions {
  constructor(
    private readonly sessions: SessionService,
    private readonly repo: Pick<SessionRepository, 'get'>,
    private readonly transcripts: Pick<TranscriptRepository, 'list'>
  ) {}

  async create(desktopId: Id, agentId: Id | undefined, cwd: string, title: string, onCreated: (session: SessionDto) => void): Promise<SessionDto> {
    const session = await this.sessions.create(desktopId, agentId, cwd, 'aside', {
      background: true,
      onCreated: (created) => {
        this.sessions.rename(created.id, title)
        onCreated(created)
      }
    })
    return this.repo.get(session.id) ?? session
  }

  get(sessionId: Id): SessionDto | null {
    return this.repo.get(sessionId)
  }

  /** The last message the agent wrote after the prompt (the final answer); a turn without text gives ''. */
  async ask(sessionId: Id, text: string): Promise<string> {
    await this.sessions.promptTurn({ sessionId, text, attachments: [] })
    const entries = this.transcripts.list(sessionId)
    const lastUser = entries.map((e) => e.kind === 'message' && e.role === 'user').lastIndexOf(true)
    const answers = entries.slice(lastUser + 1).flatMap((e) => (e.kind === 'message' && e.role === 'agent' ? [textOf(e.blocks)] : []))
    return answers.filter((a) => a !== '').at(-1) ?? ''
  }

  cancel(sessionId: Id): Promise<void> {
    return this.sessions.cancel(sessionId)
  }

  setModel(sessionId: Id, modelId: string): Promise<void> {
    return this.sessions.setModel(sessionId, modelId)
  }

  remove(sessionId: Id): Promise<void> {
    return this.sessions.remove(sessionId)
  }
}
