import { describe, expect, it } from 'vitest'
import { ProtocolEventLog } from '../events/ProtocolEventLog'
import { ProtocolSchedulerLog } from './ProtocolSchedulerLog'

describe('ProtocolSchedulerLog', () => {
  it('writes a task event to the log "scheduler" of its desktop, message first', () => {
    const log = new ProtocolEventLog({ desktopOfSession: () => null, events: { publish: () => {} } })
    new ProtocolSchedulerLog(log).record({ desktopId: 3, level: 'error', name: 'task/failed', message: 'The task "Review" failed: The agent crashed.', taskId: 8, taskName: 'Review', sessionId: 11, details: { attempt: 2 } })
    const [event] = log.query({ desktopId: 3, source: 'scheduler' })
    expect(event).toMatchObject({ desktopId: 3, sessionId: 11, source: 'scheduler', direction: 'out', level: 'error', name: 'task/failed' })
    expect(JSON.parse(event.payload)).toEqual({ message: 'The task "Review" failed: The agent crashed.', task: 'Review', taskId: 8, attempt: 2 })
    expect(event.payload.indexOf('message')).toBeLessThan(event.payload.indexOf('taskId'))
    log.dispose()
  })

  it('works without a chat', () => {
    const log = new ProtocolEventLog({ desktopOfSession: () => null, events: { publish: () => {} } })
    new ProtocolSchedulerLog(log).record({ desktopId: 3, level: 'info', name: 'task/created', message: 'm', taskId: 1, taskName: 'T' })
    expect(log.query({ desktopId: 3 })[0].sessionId).toBeNull()
    log.dispose()
  })
})
