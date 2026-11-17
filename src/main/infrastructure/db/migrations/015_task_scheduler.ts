import { NOW_SQL } from '../sql'

/**
 * Task Scheduler (docs/DESKTOP_DESIGN.md, section 13).
 *
 * - `app_kinds` gets `task-scheduler` (`INSERT OR IGNORE`, safe on a database that already has the row).
 * - A task belongs to a desktop; deleting the desktop deletes its tasks. `handled_until` is the instant (ms) up to which the
 *   scheduler dealt with the task's due times (see `ScheduledTaskRecord`).
 * - Triggers keep their position. The days of the week, the months and the days of the month are bit sets
 *   (bit 0 = Sunday, January, the 1st), so a trigger is one row. Wall-clock times are `YYYY-MM-DDTHH:mm` text with no zone.
 * - An action runs an agent. A removed agent leaves `agent_id` null: the default agent runs. A removed chat leaves
 *   `session_id` null: the run then fails with a message that says so.
 * - A run is one row of the history. Deleting a chat only unlinks its runs.
 */
export const sql = /* sql */ `
INSERT OR IGNORE INTO app_kinds (kind) VALUES ('task-scheduler');

CREATE TABLE scheduled_tasks (
  id                       INTEGER PRIMARY KEY,
  desktop_id               INTEGER NOT NULL REFERENCES desktops (id) ON DELETE CASCADE,
  name                     TEXT NOT NULL CHECK (length(name) > 0),
  description              TEXT NOT NULL DEFAULT '',
  enabled                  INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  only_if_no_other_task    INTEGER NOT NULL DEFAULT 0 CHECK (only_if_no_other_task IN (0, 1)),
  only_if_agent_idle       INTEGER NOT NULL DEFAULT 0 CHECK (only_if_agent_idle IN (0, 1)),
  only_if_not_paused       INTEGER NOT NULL DEFAULT 1 CHECK (only_if_not_paused IN (0, 1)),
  allow_on_demand          INTEGER NOT NULL DEFAULT 1 CHECK (allow_on_demand IN (0, 1)),
  run_missed               INTEGER NOT NULL DEFAULT 0 CHECK (run_missed IN (0, 1)),
  stop_if_runs_longer      INTEGER NOT NULL DEFAULT 1 CHECK (stop_if_runs_longer IN (0, 1)),
  stop_after_minutes       INTEGER NOT NULL DEFAULT 60 CHECK (stop_after_minutes > 0),
  restart_on_failure       INTEGER NOT NULL DEFAULT 0 CHECK (restart_on_failure IN (0, 1)),
  restart_interval_minutes INTEGER NOT NULL DEFAULT 5 CHECK (restart_interval_minutes > 0),
  restart_attempts         INTEGER NOT NULL DEFAULT 3 CHECK (restart_attempts > 0),
  if_running               TEXT NOT NULL DEFAULT 'ignore' CHECK (if_running IN ('ignore', 'queue', 'stop-existing')),
  handled_until            INTEGER NOT NULL,
  created_at               TEXT NOT NULL DEFAULT (${NOW_SQL})
);
CREATE INDEX ix_scheduled_tasks_desktop ON scheduled_tasks (desktop_id, id);

CREATE TABLE scheduled_task_triggers (
  id           INTEGER PRIMARY KEY,
  task_id      INTEGER NOT NULL REFERENCES scheduled_tasks (id) ON DELETE CASCADE,
  position     INTEGER NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('once', 'daily', 'weekly', 'monthly', 'startup')),
  enabled      INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  start_at     TEXT,
  expires_at   TEXT,
  repeat_every INTEGER NOT NULL DEFAULT 1 CHECK (repeat_every > 0),
  delay_minutes INTEGER NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
  days_of_week INTEGER NOT NULL DEFAULT 0 CHECK (days_of_week BETWEEN 0 AND 127),
  months       INTEGER NOT NULL DEFAULT 0 CHECK (months BETWEEN 0 AND 4095),
  days_of_month INTEGER NOT NULL DEFAULT 0 CHECK (days_of_month BETWEEN 0 AND 2147483647),
  last_day     INTEGER NOT NULL DEFAULT 0 CHECK (last_day IN (0, 1)),
  CHECK ((kind = 'startup') = (start_at IS NULL))
);
CREATE INDEX ix_scheduled_task_triggers_task ON scheduled_task_triggers (task_id, position);

CREATE TABLE scheduled_task_actions (
  id           INTEGER PRIMARY KEY,
  task_id      INTEGER NOT NULL REFERENCES scheduled_tasks (id) ON DELETE CASCADE,
  position     INTEGER NOT NULL,
  agent_id     INTEGER REFERENCES agents (id) ON DELETE SET NULL,
  cwd          TEXT NOT NULL,
  session_mode TEXT NOT NULL CHECK (session_mode IN ('new', 'existing')),
  session_id   INTEGER REFERENCES sessions (id) ON DELETE SET NULL,
  prompt       TEXT NOT NULL
);
CREATE INDEX ix_scheduled_task_actions_task ON scheduled_task_actions (task_id, position);

CREATE TABLE scheduled_task_runs (
  id         INTEGER PRIMARY KEY,
  task_id    INTEGER NOT NULL REFERENCES scheduled_tasks (id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  ended_at   TEXT,
  result     TEXT NOT NULL CHECK (result IN ('running', 'success', 'failed', 'stopped', 'skipped', 'missed')),
  message    TEXT NOT NULL DEFAULT '',
  started_by TEXT NOT NULL CHECK (started_by IN ('schedule', 'startup', 'manual', 'missed', 'retry')),
  session_id INTEGER REFERENCES sessions (id) ON DELETE SET NULL,
  attempt    INTEGER NOT NULL DEFAULT 1 CHECK (attempt >= 1)
);
CREATE INDEX ix_scheduled_task_runs_task ON scheduled_task_runs (task_id, id);
`
