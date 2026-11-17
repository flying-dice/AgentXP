import { sql as initial } from './001_initial'
import { sql as desktops } from './002_desktops'
import { sql as desktopExtras } from './003_desktop_extras'
import { sql as virtualFs } from './004_virtual_fs'
import { sql as surfaceWindows } from './005_surface_windows'
import { sql as helpApp } from './006_help_app'
import { sql as codeReview } from './007_code_review'
import { sql as asideWindows } from './008_aside_windows'
import { sql as agentDefaultMode } from './009_agent_default_mode'
import { sql as removedProjects } from './010_removed_projects'
import { sql as stoppedByPause } from './011_stopped_by_pause'
import { sql as oldTextError } from './012_old_text_error'
import { sql as kanban } from './013_kanban'
import { sql as teams } from './014_teams'
import { sql as taskScheduler } from './015_task_scheduler'

export interface Migration {
  /** Strictly increasing; stored in `PRAGMA user_version`. */
  version: number
  name: string
  sql: string
  /**
   * Rebuilds tables other tables point at (DROP + RENAME). `migrate` turns foreign keys off around it (they cannot be
   * changed inside a transaction) and runs `PRAGMA foreign_key_check` before committing.
   */
  rebuildsTables?: boolean
}

export const MIGRATIONS: readonly Migration[] = [
  { version: 1, name: 'initial', sql: initial },
  { version: 2, name: 'desktops', sql: desktops },
  { version: 3, name: 'desktop_extras', sql: desktopExtras },
  { version: 4, name: 'virtual_fs', sql: virtualFs, rebuildsTables: true },
  { version: 5, name: 'surface_windows', sql: surfaceWindows },
  { version: 6, name: 'help_app', sql: helpApp },
  { version: 7, name: 'code_review', sql: codeReview },
  { version: 8, name: 'aside_windows', sql: asideWindows },
  { version: 9, name: 'agent_default_mode', sql: agentDefaultMode },
  { version: 10, name: 'removed_projects', sql: removedProjects },
  { version: 11, name: 'stopped_by_pause', sql: stoppedByPause },
  { version: 12, name: 'old_text_error', sql: oldTextError },
  { version: 13, name: 'kanban', sql: kanban },
  { version: 14, name: 'teams', sql: teams },
  { version: 15, name: 'task_scheduler', sql: taskScheduler }
]
