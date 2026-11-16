/**
 * The chats whose running step "Pause all agents" stopped, per desktop. "Resume agents and continue" reads and clears
 * them. They are saved, not kept in a window's memory, so the "Paused" note of a chat and the Action Center line are
 * right when another window paused, after a reconnect, or when the pause came through the API.
 */
export const sql = /* sql */ `
CREATE TABLE desktop_stopped_chats (
  desktop_id INTEGER NOT NULL REFERENCES desktops (id) ON DELETE CASCADE,
  session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  PRIMARY KEY (desktop_id, session_id)
);
`
