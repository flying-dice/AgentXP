/**
 * Desktop notices (`docs/AGENT_PRESENCE.md`, section 6): what main tells the operator about agent work they were not
 * watching. A notice shows as a tray balloon (one at a time, the others wait) and stays in the Action Center.
 *
 * Pure types and functions only.
 */
import type { AppKind } from './desktop'
import type { AgentIdentity } from './identity'
import type { Id } from './models'

/**
 * - `review`: an agent left review comments.
 * - `board`: an agent changed Kanban cards.
 * - `output`: an agent drew or wrote in an output app (Agent Diagrams, Paint, WordPad) whose window is closed or behind.
 * - `summary`: a turn of a chat the operator was not watching ended (changed files, ran commands, stopped with an error).
 * - `show`: a chat the operator is not in wants to show them something (`docs/AGENT_PRESENCE.md`, section 5): **Show**
 *   and **Not now**.
 */
export type NoticeKind = 'review' | 'board' | 'output' | 'summary' | 'show'

/** Where a notice's button takes the operator. The operator asked, so it may open and focus. */
export type NoticeTarget =
  /** The chat of a session: its Chat window, or the window whose chat pane it is. */
  | { kind: 'chat'; sessionId: Id }
  /** The Code Review window of a review session, at a comment. */
  | { kind: 'review'; sessionId: Id; commentId?: Id }
  /** The Kanban board, with a card selected. */
  | { kind: 'board'; boardId: Id; cardId?: Id }
  /** Code at a file the chat changed, with its recorded change selected (the Changes pane). */
  | { kind: 'changes'; sessionId: Id; path: string }
  /** An output app's window (its existing window, else a new one). */
  | { kind: 'window'; app: AppKind; windowId?: Id }
  /** A show request: the operator accepts it (`desktop.acceptShow`), the target opens at the spot with the note. */
  | { kind: 'show'; showId: string }
  /** "Not now": the balloon goes; the request stays in the Action Center. */
  | { kind: 'later' }

export interface NoticeAction {
  id: string
  /** The button text: "Open review", "Open board", "Review changes", "Open chat", "Open diagram". */
  label: string
  target: NoticeTarget
}

export interface NoticeDto {
  /** The desktop (OS window) it is pushed to; never broadcast. */
  desktopId: Id
  /** Unique per run of the app. */
  id: string
  kind: NoticeKind
  /** The balloon title: "New review comments", "Chat finished". */
  title: string
  /** The outcome in words, starting with the agent's name: "Reviewer left 4 comments on auth.ts". */
  text: string
  /** Who did it (name and colour); absent for notices that are no agent's. */
  identity?: AgentIdentity
  /** The session it is about. */
  sessionId?: Id
  /** Exactly one for the notices of output and turns; a show request has **Show** and **Not now**. */
  actions: NoticeAction[]
  /** ISO time. */
  at: string
}

export interface NoticeEvents {
  /** A notice for the operator of this desktop: a balloon in the queue and a line in the Action Center. */
  'desktop.notice': NoticeDto
}

/** "1 file", "6 files". */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

/** The last segment of a path (both separators): "src\\auth.ts" -> "auth.ts". */
export function baseName(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts.at(-1) ?? path
}
