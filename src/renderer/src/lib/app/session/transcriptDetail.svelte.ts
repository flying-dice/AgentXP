import { localStore } from '../../desktop/chatPane'

/** localStorage key of the preference; "all" shows every thinking and tool group opened, anything else folds them. */
export const TRANSCRIPT_DETAIL_KEY = 'agent7.transcript.detail'

/**
 * Whether the transcripts of this window open their folded "Thinking" groups at once ("Show thinking and tool details",
 * View menu of Chat and Code Review). One shared preference for every transcript: it is a comfort setting, not per chat.
 */
export class TranscriptDetail {
  showAll = $state(false)

  constructor(private readonly storage: Storage | null = localStore()) {
    try {
      this.showAll = storage?.getItem(TRANSCRIPT_DETAIL_KEY) === 'all'
    } catch {
      this.showAll = false
    }
  }

  set(showAll: boolean): void {
    this.showAll = showAll
    try {
      this.storage?.setItem(TRANSCRIPT_DETAIL_KEY, showAll ? 'all' : 'summarise')
    } catch {
      // The preference then lasts until the window closes.
    }
  }

  toggle(): void {
    this.set(!this.showAll)
  }
}

/** The preference of this renderer window, shared by every transcript and menu in it. */
export const transcriptDetail = new TranscriptDetail()
