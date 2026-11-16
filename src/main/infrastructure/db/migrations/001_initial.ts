import { NOW_SQL } from '../sql'

/**
 * Initial schema (3NF).
 *
 * Design notes
 * - Ordered child lists use a composite (parent, position) key.
 * - `transcript_entries` is a supertype. Subtype tables carry a constant `entry_kind`
 *   column that is part of a composite FK, so a `tool_calls` row can only point at an
 *   entry whose kind is 'tool_call'. Subtypes that need per-session uniqueness also
 *   carry `session_id`, tied to the entry by the same composite FK.
 * - `content_blocks` is owned by either a message or a tool call content item (exactly one).
 * - JSON TEXT columns exist only for schemaless agent payloads: tool call raw input/output
 *   (arbitrary agent JSON) and A2UI component props / data model (catalog-defined props).
 * - `file_changes.kind/additions/deletions` are derived, cached at write time because the
 *   line diff is expensive and the Changes pane lists them constantly.
 */
export const sql = /* sql */ `
CREATE TABLE agents (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  command    TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (${NOW_SQL})
);
CREATE UNIQUE INDEX ux_agents_single_default ON agents (is_default) WHERE is_default = 1;

CREATE TABLE agent_args (
  agent_id INTEGER NOT NULL REFERENCES agents (id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  value    TEXT NOT NULL,
  PRIMARY KEY (agent_id, position)
);

CREATE TABLE agent_env (
  agent_id INTEGER NOT NULL REFERENCES agents (id) ON DELETE CASCADE,
  key      TEXT NOT NULL,
  value    TEXT NOT NULL,
  PRIMARY KEY (agent_id, key)
);

INSERT INTO agents (name, command, is_default) VALUES ('Claude Code', 'npx', 1);
INSERT INTO agent_args (agent_id, position, value)
  SELECT id, 0, '-y' FROM agents WHERE name = 'Claude Code';
INSERT INTO agent_args (agent_id, position, value)
  SELECT id, 1, '@zed-industries/claude-code-acp' FROM agents WHERE name = 'Claude Code';

CREATE TABLE folders (
  id             INTEGER PRIMARY KEY,
  path           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  last_opened_at TEXT,
  created_at     TEXT NOT NULL DEFAULT (${NOW_SQL})
);

CREATE TABLE sessions (
  id               INTEGER PRIMARY KEY,
  folder_id        INTEGER NOT NULL REFERENCES folders (id) ON DELETE CASCADE,
  agent_id         INTEGER NOT NULL REFERENCES agents (id) ON DELETE RESTRICT,
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
CREATE INDEX ix_sessions_folder ON sessions (folder_id, updated_at);

CREATE TABLE session_modes (
  session_id  INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  position    INTEGER NOT NULL CHECK (position >= 0),
  mode_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  PRIMARY KEY (session_id, position),
  UNIQUE (session_id, mode_id)
);

CREATE TABLE session_models (
  session_id  INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  position    INTEGER NOT NULL CHECK (position >= 0),
  model_id    TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  PRIMARY KEY (session_id, position),
  UNIQUE (session_id, model_id)
);

CREATE TABLE session_commands (
  session_id  INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  position    INTEGER NOT NULL CHECK (position >= 0),
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  hint        TEXT,
  PRIMARY KEY (session_id, position),
  UNIQUE (session_id, name)
);

CREATE TABLE transcript_entries (
  id         INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  seq        INTEGER NOT NULL CHECK (seq >= 1),
  kind       TEXT NOT NULL CHECK (kind IN ('message','tool_call','a2ui')),
  created_at TEXT NOT NULL DEFAULT (${NOW_SQL}),
  UNIQUE (session_id, seq),
  UNIQUE (id, kind),
  UNIQUE (id, session_id, kind)
);

CREATE TABLE messages (
  entry_id   INTEGER PRIMARY KEY,
  entry_kind TEXT NOT NULL DEFAULT 'message' CHECK (entry_kind = 'message'),
  role       TEXT NOT NULL CHECK (role IN ('user','agent','thought')),
  FOREIGN KEY (entry_id, entry_kind) REFERENCES transcript_entries (id, kind) ON DELETE CASCADE
);

CREATE TABLE tool_calls (
  entry_id         INTEGER PRIMARY KEY,
  session_id       INTEGER NOT NULL,
  entry_kind       TEXT NOT NULL DEFAULT 'tool_call' CHECK (entry_kind = 'tool_call'),
  acp_tool_call_id TEXT NOT NULL,
  title            TEXT NOT NULL,
  kind             TEXT NOT NULL DEFAULT 'other'
                   CHECK (kind IN ('read','edit','delete','move','search','execute','think','fetch','switch_mode','other')),
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','in_progress','completed','failed','cancelled')),
  raw_input        TEXT,
  raw_output       TEXT,
  UNIQUE (session_id, acp_tool_call_id),
  FOREIGN KEY (entry_id, session_id, entry_kind)
    REFERENCES transcript_entries (id, session_id, kind) ON DELETE CASCADE
);

CREATE TABLE tool_call_locations (
  tool_call_id INTEGER NOT NULL REFERENCES tool_calls (entry_id) ON DELETE CASCADE,
  position     INTEGER NOT NULL CHECK (position >= 0),
  path         TEXT NOT NULL,
  line         INTEGER CHECK (line IS NULL OR line >= 0),
  PRIMARY KEY (tool_call_id, position)
);

CREATE TABLE tool_call_contents (
  id           INTEGER PRIMARY KEY,
  tool_call_id INTEGER NOT NULL REFERENCES tool_calls (entry_id) ON DELETE CASCADE,
  position     INTEGER NOT NULL CHECK (position >= 0),
  kind         TEXT NOT NULL CHECK (kind IN ('content','diff','terminal')),
  path         TEXT,
  old_text     TEXT,
  new_text     TEXT,
  terminal_id  TEXT,
  UNIQUE (tool_call_id, position),
  CHECK (kind <> 'diff' OR (path IS NOT NULL AND new_text IS NOT NULL AND terminal_id IS NULL)),
  CHECK (kind <> 'terminal' OR (terminal_id IS NOT NULL AND path IS NULL AND old_text IS NULL AND new_text IS NULL)),
  CHECK (kind <> 'content' OR (path IS NULL AND old_text IS NULL AND new_text IS NULL AND terminal_id IS NULL))
);

CREATE TABLE content_blocks (
  id              INTEGER PRIMARY KEY,
  message_id      INTEGER REFERENCES messages (entry_id) ON DELETE CASCADE,
  tool_content_id INTEGER REFERENCES tool_call_contents (id) ON DELETE CASCADE,
  position        INTEGER NOT NULL CHECK (position >= 0),
  kind            TEXT NOT NULL CHECK (kind IN ('text','image','resource_link','resource')),
  text            TEXT,
  mime_type       TEXT,
  uri             TEXT,
  name            TEXT,
  data            BLOB,
  UNIQUE (message_id, position),
  UNIQUE (tool_content_id, position),
  CHECK ((message_id IS NULL) <> (tool_content_id IS NULL)),
  CHECK (kind <> 'text' OR text IS NOT NULL),
  CHECK (kind <> 'image' OR (mime_type IS NOT NULL AND data IS NOT NULL)),
  CHECK (kind <> 'resource_link' OR (uri IS NOT NULL AND name IS NOT NULL)),
  CHECK (kind <> 'resource' OR uri IS NOT NULL)
);

CREATE TABLE permission_requests (
  id                 INTEGER PRIMARY KEY,
  tool_call_id       INTEGER NOT NULL REFERENCES tool_calls (entry_id) ON DELETE CASCADE,
  outcome            TEXT NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending','selected','cancelled')),
  selected_option_id TEXT,
  created_at         TEXT NOT NULL DEFAULT (${NOW_SQL}),
  resolved_at        TEXT,
  CHECK ((outcome = 'selected') = (selected_option_id IS NOT NULL)),
  FOREIGN KEY (id, selected_option_id) REFERENCES permission_options (request_id, option_id)
);
CREATE INDEX ix_permission_requests_tool_call ON permission_requests (tool_call_id);
CREATE INDEX ix_permission_requests_pending ON permission_requests (outcome) WHERE outcome = 'pending';

CREATE TABLE permission_options (
  request_id INTEGER NOT NULL REFERENCES permission_requests (id) ON DELETE CASCADE,
  position   INTEGER NOT NULL CHECK (position >= 0),
  option_id  TEXT NOT NULL,
  name       TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('allow_once','allow_always','reject_once','reject_always')),
  PRIMARY KEY (request_id, position),
  UNIQUE (request_id, option_id)
);

CREATE TABLE tasks (
  id         INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  position   INTEGER NOT NULL CHECK (position >= 0),
  content    TEXT NOT NULL,
  priority   TEXT NOT NULL CHECK (priority IN ('high','medium','low')),
  status     TEXT NOT NULL CHECK (status IN ('pending','in_progress','completed')),
  UNIQUE (session_id, position)
);

CREATE TABLE file_changes (
  id            INTEGER PRIMARY KEY,
  session_id    INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  path          TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('added','modified','deleted')),
  original_text TEXT,
  current_text  TEXT,
  additions     INTEGER NOT NULL DEFAULT 0 CHECK (additions >= 0),
  deletions     INTEGER NOT NULL DEFAULT 0 CHECK (deletions >= 0),
  created_at    TEXT NOT NULL DEFAULT (${NOW_SQL}),
  updated_at    TEXT NOT NULL DEFAULT (${NOW_SQL}),
  UNIQUE (session_id, path)
);

CREATE TABLE terminals (
  id               INTEGER PRIMARY KEY,
  session_id       INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  acp_terminal_id  TEXT NOT NULL,
  command          TEXT NOT NULL,
  cwd              TEXT,
  output           TEXT NOT NULL DEFAULT '',
  exit_code        INTEGER,
  signal           TEXT,
  created_at       TEXT NOT NULL DEFAULT (${NOW_SQL}),
  UNIQUE (session_id, acp_terminal_id)
);

CREATE TABLE terminal_args (
  terminal_id INTEGER NOT NULL REFERENCES terminals (id) ON DELETE CASCADE,
  position    INTEGER NOT NULL CHECK (position >= 0),
  value       TEXT NOT NULL,
  PRIMARY KEY (terminal_id, position)
);

CREATE TABLE a2ui_surfaces (
  id         INTEGER PRIMARY KEY,
  entry_id   INTEGER NOT NULL UNIQUE,
  session_id INTEGER NOT NULL,
  entry_kind TEXT NOT NULL DEFAULT 'a2ui' CHECK (entry_kind = 'a2ui'),
  surface_id TEXT NOT NULL,
  title      TEXT,
  catalog_id TEXT NOT NULL,
  data_model TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data_model)),
  UNIQUE (session_id, surface_id),
  FOREIGN KEY (entry_id, session_id, entry_kind)
    REFERENCES transcript_entries (id, session_id, kind) ON DELETE CASCADE
);

CREATE TABLE a2ui_components (
  id           INTEGER PRIMARY KEY,
  surface_id   INTEGER NOT NULL REFERENCES a2ui_surfaces (id) ON DELETE CASCADE,
  position     INTEGER NOT NULL CHECK (position >= 0),
  component_id TEXT NOT NULL,
  component    TEXT NOT NULL,
  props        TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(props)),
  UNIQUE (surface_id, component_id),
  UNIQUE (surface_id, position)
);

CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (${NOW_SQL})
);
`
