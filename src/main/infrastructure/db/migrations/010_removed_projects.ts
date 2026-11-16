import { NOW_SQL } from '../sql'

/**
 * Projects that were removed (ejected) from a desktop, so that Computer can offer "Plug in again" and the agent's
 * refusal can name the project. One row per project and desktop; the newest five are kept (`DriveService` trims).
 * Plugging the project in again, deleting the desktop or removing the folder deletes the row.
 */
export const sql = /* sql */ `
CREATE TABLE desktop_removed_projects (
  desktop_id INTEGER NOT NULL REFERENCES desktops (id) ON DELETE CASCADE,
  folder_id  INTEGER NOT NULL REFERENCES folders (id) ON DELETE CASCADE,
  letter     TEXT NOT NULL,
  label      TEXT NOT NULL,
  removed_at TEXT NOT NULL DEFAULT (${NOW_SQL}),
  UNIQUE (desktop_id, folder_id)
);
`
