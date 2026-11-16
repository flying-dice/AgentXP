/**
 * Agent windows: A2UI surfaces that live in their own desktop window (docs/DESKTOP_DESIGN.md, section 10).
 *
 * - `app_kinds` gets `surface`.
 * - `a2ui_surfaces.target` says where the surface is shown: `inline` (in the transcript, the default and what
 *   every existing surface is), `sidebar` (a panel of the Chat window) or `window`. `hidden` is the user having
 *   closed a sidebar tab (a window is "closed" when it has no row).
 * - `surface_windows` is the subtype table of a `surface` window: it points at the surface it shows
 *   (one window per surface). Closing the window deletes the `app_windows` row (and this one) and keeps the
 *   surface; deleting the surface (or its chat) deletes the window through the trigger, like a chat window.
 */
export const sql = /* sql */ `
INSERT INTO app_kinds (kind) VALUES ('surface');

ALTER TABLE a2ui_surfaces ADD COLUMN target TEXT NOT NULL DEFAULT 'inline' CHECK (target IN ('inline', 'sidebar', 'window'));
ALTER TABLE a2ui_surfaces ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1));

CREATE TABLE surface_windows (
  window_id  INTEGER PRIMARY KEY REFERENCES app_windows (id) ON DELETE CASCADE,
  surface_id INTEGER NOT NULL UNIQUE REFERENCES a2ui_surfaces (id) ON DELETE CASCADE
);

CREATE TRIGGER trg_surface_window_removed AFTER DELETE ON surface_windows
BEGIN
  DELETE FROM app_windows WHERE id = OLD.window_id;
END;
`
