/**
 * Skills and tools for a scheduled run (docs/DESKTOP_DESIGN.md, section 13).
 *
 * - An action chooses how the chat that it starts gets its skills and MCP tools: `inherit` (everything that is switched on, as a
 *   plain chat), `profile` (a profile), `team` (the first member of a team, with the skills of the team) or `custom` (the listed
 *   skills and servers, minus the listed tools). A removed profile or team leaves the id null: the run then fails with a message
 *   that says so.
 * - The chosen skills and servers keep the name they had when the task was saved. A removed skill or server leaves the id null
 *   (`ON DELETE SET NULL`), so the run can name what is missing. A removed server takes its hidden-tool rows with it.
 * - A chat that a scheduled run started with a choice keeps it in `session_scopes` (the instructions) and its child tables,
 *   so a reconnect of the chat gives the agent the same skills and servers. A chat without a row has everything that is on.
 */
export const sql = /* sql */ `
ALTER TABLE scheduled_task_actions ADD COLUMN capabilities TEXT NOT NULL DEFAULT 'inherit' CHECK (capabilities IN ('inherit', 'profile', 'team', 'custom'));
ALTER TABLE scheduled_task_actions ADD COLUMN profile_id INTEGER REFERENCES profiles (id) ON DELETE SET NULL;
ALTER TABLE scheduled_task_actions ADD COLUMN team_id INTEGER REFERENCES teams (id) ON DELETE SET NULL;

CREATE TABLE scheduled_action_skills (
  action_id  INTEGER NOT NULL REFERENCES scheduled_task_actions (id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  skill_id   INTEGER REFERENCES skills (id) ON DELETE SET NULL,
  skill_name TEXT NOT NULL,
  PRIMARY KEY (action_id, position)
);

CREATE TABLE scheduled_action_servers (
  action_id   INTEGER NOT NULL REFERENCES scheduled_task_actions (id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  server_id   INTEGER REFERENCES mcp_servers (id) ON DELETE SET NULL,
  server_name TEXT NOT NULL,
  PRIMARY KEY (action_id, position)
);

CREATE TABLE scheduled_action_hidden_tools (
  action_id INTEGER NOT NULL REFERENCES scheduled_task_actions (id) ON DELETE CASCADE,
  server_id INTEGER NOT NULL REFERENCES mcp_servers (id) ON DELETE CASCADE,
  tool      TEXT NOT NULL,
  PRIMARY KEY (action_id, server_id, tool)
);

CREATE TABLE session_scopes (
  session_id   INTEGER PRIMARY KEY REFERENCES sessions (id) ON DELETE CASCADE,
  instructions TEXT NOT NULL DEFAULT ''
);

CREATE TABLE session_scope_skills (
  session_id INTEGER NOT NULL REFERENCES session_scopes (session_id) ON DELETE CASCADE,
  skill_id   INTEGER NOT NULL REFERENCES skills (id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, skill_id)
);

CREATE TABLE session_scope_servers (
  session_id INTEGER NOT NULL REFERENCES session_scopes (session_id) ON DELETE CASCADE,
  server_id  INTEGER NOT NULL REFERENCES mcp_servers (id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, server_id)
);

CREATE TABLE session_scope_hidden_tools (
  session_id INTEGER NOT NULL REFERENCES session_scopes (session_id) ON DELETE CASCADE,
  server_id  INTEGER NOT NULL REFERENCES mcp_servers (id) ON DELETE CASCADE,
  tool       TEXT NOT NULL,
  PRIMARY KEY (session_id, server_id, tool)
);
`
