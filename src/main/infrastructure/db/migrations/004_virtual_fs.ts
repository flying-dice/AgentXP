import { NOW_SQL } from '../sql'

/**
 * Virtual file system and long-lived desktops (docs/DESKTOP_DESIGN.md, "Virtual file system and launcher").
 *
 * - `desktop_drives`: the projects plugged into a desktop as USB drives (E:, F:, ...). `C:` is not a row: it is the
 *   desktop's private app-data folder. Existing desktops get their old folder as drive E:.
 * - `desktops` loses `folder_id` (a desktop is no longer tied to one folder) and gains `last_used_at`.
 *   `is_open` now means "connected" (an OS window shows the desktop).
 * - `sessions` loses `folder_id` and gains `cwd`, the chat's working directory as a VPath. Existing chats: `E:\`.
 * - `file_changes` and `recycled_changes` locate a file by (`folder_id`, root-relative `path`): `folder_id` NULL is the
 *   desktop's C:. The drive letter is looked up when the row is read, so a project plugged in again under another
 *   letter keeps its changes. Relative paths are stored with `/`.
 * - `path_windows.relative_path` becomes `path`, a VPath ('' never stored: an Explorer on "Computer" has no row).
 *
 * `desktops` and `sessions` are rebuilt (SQLite cannot drop a column that has a foreign key), so this migration
 * runs with foreign keys off (`rebuildsTables`); `migrate` checks the result.
 */
export const sql = /* sql */ `
CREATE TABLE desktop_drives (
  desktop_id INTEGER NOT NULL REFERENCES desktops (id) ON DELETE CASCADE,
  letter     TEXT NOT NULL CHECK (letter GLOB '[E-Z]'),
  folder_id  INTEGER NOT NULL REFERENCES folders (id) ON DELETE CASCADE,
  plugged_at TEXT NOT NULL DEFAULT (${NOW_SQL}),
  UNIQUE (desktop_id, letter),
  UNIQUE (desktop_id, folder_id)
);
INSERT INTO desktop_drives (desktop_id, letter, folder_id) SELECT id, 'E', folder_id FROM desktops;

-- file_changes: (session, folder, path) instead of (session, path). Needs sessions.folder_id, so it goes first.
CREATE TABLE file_changes_new (
  id            INTEGER PRIMARY KEY,
  session_id    INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  folder_id     INTEGER REFERENCES folders (id) ON DELETE CASCADE,
  path          TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('added','modified','deleted')),
  original_text TEXT,
  current_text  TEXT,
  additions     INTEGER NOT NULL DEFAULT 0 CHECK (additions >= 0),
  deletions     INTEGER NOT NULL DEFAULT 0 CHECK (deletions >= 0),
  created_at    TEXT NOT NULL DEFAULT (${NOW_SQL}),
  updated_at    TEXT NOT NULL DEFAULT (${NOW_SQL})
);
INSERT INTO file_changes_new (id, session_id, folder_id, path, kind, original_text, current_text, additions, deletions, created_at, updated_at)
SELECT c.id, c.session_id, s.folder_id, replace(c.path, '\\', '/'), c.kind, c.original_text, c.current_text,
       c.additions, c.deletions, c.created_at, c.updated_at
FROM file_changes c JOIN sessions s ON s.id = c.session_id;
DROP TABLE file_changes;
ALTER TABLE file_changes_new RENAME TO file_changes;
CREATE UNIQUE INDEX ux_file_changes_target ON file_changes (session_id, COALESCE(folder_id, 0), path);

-- recycled_changes: the desktop's old folder becomes the folder of each row.
ALTER TABLE recycled_changes ADD COLUMN folder_id INTEGER REFERENCES folders (id) ON DELETE CASCADE;
UPDATE recycled_changes
SET folder_id = (SELECT d.folder_id FROM desktops d WHERE d.id = recycled_changes.desktop_id),
    path = replace(path, '\\', '/');

-- path_windows: folder-relative paths become VPaths on E:.
UPDATE path_windows SET relative_path = 'E:\\' || replace(relative_path, '/', '\\');
ALTER TABLE path_windows RENAME COLUMN relative_path TO path;

-- sessions: folder_id -> cwd.
DROP INDEX ix_sessions_folder;
DROP INDEX ix_sessions_desktop;
CREATE TABLE sessions_new (
  id               INTEGER PRIMARY KEY,
  agent_id         INTEGER NOT NULL REFERENCES agents (id) ON DELETE RESTRICT,
  desktop_id       INTEGER REFERENCES desktops (id) ON DELETE CASCADE,
  cwd              TEXT NOT NULL DEFAULT 'C:\\Users\\Agent',
  acp_session_id   TEXT,
  title            TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'idle'
                   CHECK (status IN ('idle','connecting','working','awaiting_permission','error','closed')),
  current_mode_id  TEXT,
  current_model_id TEXT,
  context_used     INTEGER NOT NULL DEFAULT 0 CHECK (context_used >= 0),
  context_size     INTEGER NOT NULL DEFAULT 0 CHECK (context_size >= 0),
  created_at       TEXT NOT NULL DEFAULT (${NOW_SQL}),
  updated_at       TEXT NOT NULL DEFAULT (${NOW_SQL}),
  UNIQUE (agent_id, acp_session_id)
);
INSERT INTO sessions_new (id, agent_id, desktop_id, cwd, acp_session_id, title, status, current_mode_id, current_model_id,
                          context_used, context_size, created_at, updated_at)
SELECT id, agent_id, desktop_id,
       CASE WHEN desktop_id IS NULL THEN 'C:\\Users\\Agent' ELSE 'E:\\' END,
       acp_session_id, title, status, current_mode_id, current_model_id, context_used, context_size, created_at, updated_at
FROM sessions;
DROP TABLE sessions;
ALTER TABLE sessions_new RENAME TO sessions;
CREATE INDEX ix_sessions_desktop ON sessions (desktop_id, updated_at);

-- desktops: no folder_id, last_used_at, new connections start closed.
DROP INDEX ix_desktops_folder;
CREATE TABLE desktops_new (
  id              INTEGER PRIMARY KEY,
  agent_id        INTEGER REFERENCES agents (id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  is_open         INTEGER NOT NULL DEFAULT 0 CHECK (is_open IN (0, 1)),
  paused          INTEGER NOT NULL DEFAULT 0 CHECK (paused IN (0, 1)),
  user_in_control INTEGER NOT NULL DEFAULT 0 CHECK (user_in_control IN (0, 1)),
  created_at      TEXT NOT NULL DEFAULT (${NOW_SQL}),
  last_used_at    TEXT NOT NULL DEFAULT (${NOW_SQL})
);
INSERT INTO desktops_new (id, agent_id, title, is_open, paused, user_in_control, created_at, last_used_at)
SELECT d.id, d.agent_id, d.title, d.is_open, d.paused, d.user_in_control, d.created_at,
       COALESCE((SELECT MAX(s.updated_at) FROM sessions s WHERE s.desktop_id = d.id), d.created_at)
FROM desktops d;
DROP TABLE desktops;
ALTER TABLE desktops_new RENAME TO desktops;
`
