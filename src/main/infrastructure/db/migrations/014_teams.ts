/**
 * Skills, MCP servers, profiles, teams and team chat rooms.
 *
 * - `skills`: installed skill folders (`SKILL.md`), copied into the app's data folder.
 * - `mcp_servers` (+ args, vars, tools): MCP servers handed to agents; `mcp_server_vars` holds the environment (stdio) or
 *   the headers (http), with a `secret` flag for the ones shown masked; `mcp_server_tools` keeps the per-tool switches.
 * - `profiles` (+ skills, MCP servers): one member of a team; `teams` (+ members, skills): a group of profiles with
 *   instructions and skills of their own. `teams.board_ref` is an opaque hook for a work board.
 * - `rooms`, `room_messages`, `room_members`: the team chat room of a desktop; each member has its own `aside` session
 *   (`room_members.session_id`) and the number of the last message it has seen.
 * - `app_kinds` gets `teams` and `team-chat`. A `team-chat` window keeps its room number in `path_windows.path`.
 */
export const sql = /* sql */ `
CREATE TABLE skills (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  description  TEXT NOT NULL,
  path         TEXT NOT NULL,
  enabled      INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  installed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE mcp_servers (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL UNIQUE,
  transport      TEXT NOT NULL CHECK (transport IN ('stdio', 'http')),
  command        TEXT NOT NULL DEFAULT '',
  url            TEXT NOT NULL DEFAULT '',
  enabled        INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  last_test_ok   INTEGER CHECK (last_test_ok IN (0, 1)),
  last_test_text TEXT,
  last_test_at   TEXT
);
CREATE TABLE mcp_server_args (
  server_id INTEGER NOT NULL REFERENCES mcp_servers (id) ON DELETE CASCADE,
  position  INTEGER NOT NULL,
  value     TEXT NOT NULL,
  PRIMARY KEY (server_id, position)
);
CREATE TABLE mcp_server_vars (
  server_id INTEGER NOT NULL REFERENCES mcp_servers (id) ON DELETE CASCADE,
  key       TEXT NOT NULL,
  value     TEXT NOT NULL,
  secret    INTEGER NOT NULL DEFAULT 0 CHECK (secret IN (0, 1)),
  PRIMARY KEY (server_id, key)
);
CREATE TABLE mcp_server_tools (
  server_id   INTEGER NOT NULL REFERENCES mcp_servers (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  enabled     INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  PRIMARY KEY (server_id, name)
);

CREATE TABLE profiles (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  instructions TEXT NOT NULL DEFAULT '',
  agent_id     INTEGER REFERENCES agents (id) ON DELETE SET NULL,
  model        TEXT,
  color        TEXT NOT NULL
);
CREATE TABLE profile_skills (
  profile_id INTEGER NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  skill_id   INTEGER NOT NULL REFERENCES skills (id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, skill_id)
);
CREATE TABLE profile_mcp_servers (
  profile_id INTEGER NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  server_id  INTEGER NOT NULL REFERENCES mcp_servers (id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, server_id)
);

CREATE TABLE teams (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  instructions TEXT NOT NULL DEFAULT '',
  board_ref    TEXT
);
CREATE TABLE team_members (
  team_id    INTEGER NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  profile_id INTEGER NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  PRIMARY KEY (team_id, profile_id)
);
CREATE TABLE team_skills (
  team_id  INTEGER NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills (id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, skill_id)
);

CREATE TABLE rooms (
  id         INTEGER PRIMARY KEY,
  desktop_id INTEGER NOT NULL REFERENCES desktops (id) ON DELETE CASCADE,
  team_id    INTEGER NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  cwd        TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX ix_rooms_desktop ON rooms (desktop_id);
CREATE TABLE room_messages (
  id         INTEGER PRIMARY KEY,
  room_id    INTEGER NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  profile_id INTEGER REFERENCES profiles (id) ON DELETE SET NULL,
  author     TEXT NOT NULL,
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX ix_room_messages_room ON room_messages (room_id, id);
CREATE TABLE room_members (
  room_id      INTEGER NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  profile_id   INTEGER NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  session_id   INTEGER REFERENCES sessions (id) ON DELETE SET NULL,
  last_seen_id INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (room_id, profile_id)
);

INSERT OR IGNORE INTO app_kinds (kind) VALUES ('teams'), ('team-chat');
`
