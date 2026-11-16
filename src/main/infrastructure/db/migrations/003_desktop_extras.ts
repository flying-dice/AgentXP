import { NOW_SQL } from '../sql'

/**
 * Sticky Notes and the Recycle Bin (docs/DESKTOP_DESIGN.md, section 8).
 *
 * - A note belongs to a desktop. `plan_session_id` makes it mirror that chat's tasks; the chat going
 *   away only unlinks the note.
 * - A recycled change is a file change the user reverted. It belongs to the desktop (so the bin
 *   outlives the chat); `session_id` is kept for re-recording a restore and set null with the chat.
 * - Texts are TEXT columns; no blobs.
 */
export const sql = /* sql */ `
INSERT INTO app_kinds (kind) VALUES
  ('paint'), ('wordpad'), ('sticky-notes'), ('event-viewer'), ('snipping-tool'), ('recycle-bin');

CREATE TABLE sticky_notes (
  id              INTEGER PRIMARY KEY,
  desktop_id      INTEGER NOT NULL REFERENCES desktops (id) ON DELETE CASCADE,
  text            TEXT NOT NULL DEFAULT '',
  color           TEXT NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow', 'blue', 'green', 'pink', 'purple', 'white')),
  x               INTEGER NOT NULL,
  y               INTEGER NOT NULL,
  width           INTEGER NOT NULL CHECK (width > 0),
  height          INTEGER NOT NULL CHECK (height > 0),
  plan_session_id INTEGER REFERENCES sessions (id) ON DELETE SET NULL,
  author          TEXT NOT NULL CHECK (author IN ('user', 'agent')),
  created_at      TEXT NOT NULL DEFAULT (${NOW_SQL})
);
CREATE INDEX ix_sticky_notes_desktop ON sticky_notes (desktop_id, id);
CREATE INDEX ix_sticky_notes_plan ON sticky_notes (plan_session_id);

CREATE TABLE recycled_changes (
  id            INTEGER PRIMARY KEY,
  desktop_id    INTEGER NOT NULL REFERENCES desktops (id) ON DELETE CASCADE,
  session_id    INTEGER REFERENCES sessions (id) ON DELETE SET NULL,
  path          TEXT NOT NULL,
  reverted_text TEXT,
  restored_text TEXT,
  reverted_at   TEXT NOT NULL DEFAULT (${NOW_SQL})
);
CREATE INDEX ix_recycled_changes_desktop ON recycled_changes (desktop_id, id);
`
