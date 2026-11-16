import { NOW_SQL } from '../sql'

/**
 * Code Review (docs/DESKTOP_DESIGN.md, section 11).
 *
 * - `app_kinds` gets `code-review` (`INSERT OR IGNORE`, safe on a database that already has the row).
 * - `sessions.role` says what a session is for: `chat` (every existing session), `review` (the reviewer that owns a
 *   Code Review window) or `aside` (the short-lived embedded chat panel of another app). The window links to its
 *   session through `chat_windows` and keeps its review root in `path_windows`; `path_windows.base_ref` is the ref
 *   the working tree is compared with (null = HEAD).
 * - `review_comments`: the comments of a review session, MR style. A reply points at its thread root (`parent_id`).
 *   Deleting the session (when the window closes) or the root deletes the comments.
 * - `review_summaries`: the verdict of a review session (at most one: submitting again replaces it).
 */
export const sql = /* sql */ `
INSERT OR IGNORE INTO app_kinds (kind) VALUES ('code-review');

ALTER TABLE sessions ADD COLUMN role TEXT NOT NULL DEFAULT 'chat' CHECK (role IN ('chat', 'review', 'aside'));
ALTER TABLE path_windows ADD COLUMN base_ref TEXT;

CREATE TABLE review_comments (
  id         INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  path       TEXT NOT NULL,
  line_start INTEGER NOT NULL CHECK (line_start >= 1),
  line_end   INTEGER NOT NULL CHECK (line_end >= line_start),
  side       TEXT NOT NULL DEFAULT 'new' CHECK (side IN ('old', 'new')),
  body       TEXT NOT NULL CHECK (length(body) > 0),
  severity   TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('blocker', 'major', 'minor', 'nit')),
  state      TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'resolved', 'sent')),
  author     TEXT NOT NULL CHECK (author IN ('agent', 'user')),
  parent_id  INTEGER REFERENCES review_comments (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (${NOW_SQL})
);
CREATE INDEX ix_review_comments_session ON review_comments (session_id, path, line_start);

CREATE TABLE review_summaries (
  session_id INTEGER PRIMARY KEY REFERENCES sessions (id) ON DELETE CASCADE,
  verdict    TEXT NOT NULL CHECK (verdict IN ('approve', 'request_changes', 'comment')),
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (${NOW_SQL})
);
`
