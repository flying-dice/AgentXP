import { NOW_SQL } from '../sql'

/**
 * Kanban (boards of columns of cards).
 *
 * - A board belongs to a desktop and goes with it; a column belongs to a board, a card to a column.
 * - `position` orders columns in a board and cards in a column (0, 1, 2, ...); the service rewrites it on a move.
 * - A card's assignee is free text (a person or an agent profile name), so it survives a profile being renamed or removed.
 * - `app_kinds` gets `kanban`.
 */
export const sql = /* sql */ `
INSERT OR IGNORE INTO app_kinds (kind) VALUES ('kanban');

CREATE TABLE kanban_boards (
  id          INTEGER PRIMARY KEY,
  desktop_id  INTEGER NOT NULL REFERENCES desktops (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (${NOW_SQL})
);
CREATE INDEX ix_kanban_boards_desktop ON kanban_boards (desktop_id, id);

CREATE TABLE kanban_columns (
  id        INTEGER PRIMARY KEY,
  board_id  INTEGER NOT NULL REFERENCES kanban_boards (id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  position  INTEGER NOT NULL
);
CREATE INDEX ix_kanban_columns_board ON kanban_columns (board_id, position);

CREATE TABLE kanban_cards (
  id           INTEGER PRIMARY KEY,
  column_id    INTEGER NOT NULL REFERENCES kanban_columns (id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  assignee     TEXT,
  position     INTEGER NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (${NOW_SQL})
);
CREATE INDEX ix_kanban_cards_column ON kanban_cards (column_id, position);
`
