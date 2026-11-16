import { NOW_SQL } from '../sql'

/**
 * Desktops (docs/DESKTOP_DESIGN.md, section 8).
 *
 * - A desktop belongs to one folder; chats (`sessions`) belong to a desktop.
 * - `app_windows` is the supertype of every window; chat/path/browser windows add their own columns.
 * - Deleting a chat deletes its window row (trigger), so a window never points at a missing chat.
 * - Existing sessions: one desktop per folder that has sessions. Only the desktop of the most
 *   recently used chat is left open, so the first launch after the upgrade opens one window.
 */
export const sql = /* sql */ `
CREATE TABLE app_kinds (kind TEXT PRIMARY KEY);
INSERT INTO app_kinds (kind) VALUES
  ('chat'), ('explorer'), ('notepad'), ('code'), ('terminal'), ('browser'), ('control-centre'), ('agent-manager');

CREATE TABLE desktops (
  id              INTEGER PRIMARY KEY,
  folder_id       INTEGER NOT NULL REFERENCES folders (id) ON DELETE CASCADE,
  agent_id        INTEGER REFERENCES agents (id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  is_open         INTEGER NOT NULL DEFAULT 1 CHECK (is_open IN (0, 1)),
  paused          INTEGER NOT NULL DEFAULT 0 CHECK (paused IN (0, 1)),
  user_in_control INTEGER NOT NULL DEFAULT 0 CHECK (user_in_control IN (0, 1)),
  created_at      TEXT NOT NULL DEFAULT (${NOW_SQL})
);
CREATE INDEX ix_desktops_folder ON desktops (folder_id);

ALTER TABLE sessions ADD COLUMN desktop_id INTEGER REFERENCES desktops (id) ON DELETE CASCADE;
CREATE INDEX ix_sessions_desktop ON sessions (desktop_id);

CREATE TABLE app_windows (
  id           INTEGER PRIMARY KEY,
  desktop_id   INTEGER NOT NULL REFERENCES desktops (id) ON DELETE CASCADE,
  kind         TEXT NOT NULL REFERENCES app_kinds (kind),
  x            INTEGER NOT NULL,
  y            INTEGER NOT NULL,
  width        INTEGER NOT NULL CHECK (width > 0),
  height       INTEGER NOT NULL CHECK (height > 0),
  window_state TEXT NOT NULL CHECK (window_state IN ('normal', 'minimized', 'maximized')),
  z_order      INTEGER NOT NULL,
  opened_by    TEXT NOT NULL CHECK (opened_by IN ('user', 'agent'))
);
CREATE INDEX ix_app_windows_desktop ON app_windows (desktop_id, z_order);

CREATE TABLE chat_windows (
  window_id  INTEGER PRIMARY KEY REFERENCES app_windows (id) ON DELETE CASCADE,
  session_id INTEGER NOT NULL UNIQUE REFERENCES sessions (id) ON DELETE CASCADE
);
-- Explorer, Notepad and Code.
CREATE TABLE path_windows (
  window_id     INTEGER PRIMARY KEY REFERENCES app_windows (id) ON DELETE CASCADE,
  relative_path TEXT NOT NULL
);
CREATE TABLE browser_windows (
  window_id INTEGER PRIMARY KEY REFERENCES app_windows (id) ON DELETE CASCADE,
  url       TEXT NOT NULL
);

CREATE TRIGGER trg_chat_window_removed AFTER DELETE ON chat_windows
BEGIN
  DELETE FROM app_windows WHERE id = OLD.window_id;
END;

-- Control Center policy: one row per tool group, plus 'openApps'.
CREATE TABLE tool_group_policies (
  tool_group TEXT PRIMARY KEY,
  decision   TEXT NOT NULL CHECK (decision IN ('allow', 'ask', 'deny'))
);

INSERT INTO desktops (folder_id, agent_id, title, is_open)
SELECT f.id,
       (SELECT s.agent_id FROM sessions s WHERE s.folder_id = f.id ORDER BY s.updated_at DESC, s.id DESC LIMIT 1),
       f.name,
       0
FROM folders f
WHERE EXISTS (SELECT 1 FROM sessions s WHERE s.folder_id = f.id)
ORDER BY f.id;

UPDATE sessions SET desktop_id = (SELECT d.id FROM desktops d WHERE d.folder_id = sessions.folder_id ORDER BY d.id LIMIT 1);

UPDATE desktops SET is_open = 1
WHERE id = (SELECT s.desktop_id FROM sessions s ORDER BY s.updated_at DESC, s.id DESC LIMIT 1);
`
