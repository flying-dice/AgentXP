/**
 * The chat pane of every app window (docs/DESKTOP_DESIGN.md, section 12).
 *
 * `aside_windows` links an app window to its short-lived `aside` session (`sessions.role = 'aside'`, migration 007).
 * It is a table of its own, not `chat_windows`: a `chat_windows` row owns its window (the trigger
 * `trg_chat_window_removed` deletes the window with the row), but an aside belongs to a window that has a life of its
 * own. The window row owns the link: deleting the window deletes the row, and `DesktopService.closeWindow` then deletes
 * the session. Deleting the session ("New conversation") deletes the row and leaves the window.
 */
export const sql = /* sql */ `
CREATE TABLE aside_windows (
  window_id  INTEGER PRIMARY KEY REFERENCES app_windows (id) ON DELETE CASCADE,
  session_id INTEGER NOT NULL UNIQUE REFERENCES sessions (id) ON DELETE CASCADE
);
`
