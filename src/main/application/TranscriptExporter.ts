import type { Id } from '@shared/models'
import type { SessionRepository } from '../domain/repositories/session-repository'
import type { TranscriptRepository } from '../domain/repositories/transcript-repository'
import { required } from './errors'
import type { TextFileSaver } from './ports'
import { exportFileName, transcriptToMarkdown } from './transcriptMarkdown'

/** Exports a session transcript as a Markdown file chosen by the user. */
export class TranscriptExporter {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly transcripts: TranscriptRepository,
    private readonly saver: TextFileSaver
  ) {}

  /** Resolves to the saved path, or null when the user cancelled the dialog. */
  export(sessionId: Id): Promise<string | null> {
    const session = required(this.sessions.get(sessionId), 'Session')
    const markdown = transcriptToMarkdown(session, this.transcripts.list(sessionId))
    return this.saver.saveText(exportFileName(session.title), markdown)
  }
}
