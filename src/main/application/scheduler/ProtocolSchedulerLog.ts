import type { ProtocolEventLog } from '../events/ProtocolEventLog'
import type { SchedulerLog, SchedulerLogRecord } from './ports'

/** Writes what the scheduler does to the Event Viewer, in its log "Task Scheduler". The message comes first in the payload: it is the text of the row. */
export class ProtocolSchedulerLog implements SchedulerLog {
  constructor(private readonly log: Pick<ProtocolEventLog, 'record'>) {}

  record(record: SchedulerLogRecord): void {
    this.log.record({
      sessionId: record.sessionId ?? null,
      desktopId: record.desktopId,
      source: 'scheduler',
      direction: 'out',
      name: record.name,
      level: record.level,
      payload: { message: record.message, task: record.taskName, taskId: record.taskId, ...(record.details ?? {}) }
    })
  }
}
