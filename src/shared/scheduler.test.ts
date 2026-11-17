import { describe, expect, it } from 'vitest'
import { newTrigger } from './schedule'
import { DEFAULT_SETTINGS, actionProblem, nextFullHour, newAgentAction, newTaskInput, settingsProblem, taskProblem, type ScheduledTaskInput } from './scheduler'

const valid = (): ScheduledTaskInput => ({
  ...newTaskInput('E:\\', [newTrigger('daily', '2026-11-17T09:00')]),
  name: 'Nightly review',
  actions: [{ ...newAgentAction('E:\\'), prompt: 'Review the open pull requests.' }]
})

describe('task checks', () => {
  it('accepts a complete task, with or without triggers (run on demand only)', () => {
    expect(taskProblem(valid())).toBeNull()
    expect(taskProblem({ ...valid(), triggers: [] })).toBeNull()
  })

  it('asks for a name, an action and a prompt', () => {
    expect(taskProblem({ ...valid(), name: '   ' })).toMatch(/name/)
    expect(taskProblem({ ...valid(), name: 'x'.repeat(121) })).toMatch(/at most 120/)
    expect(taskProblem({ ...valid(), actions: [] })).toMatch(/at least one action/)
    expect(taskProblem({ ...valid(), actions: [newAgentAction('E:\\')] })).toMatch(/prompt/)
  })

  it('checks the project and the chat of an action', () => {
    const action = { ...newAgentAction('E:\\'), prompt: 'Go.' }
    expect(actionProblem({ ...action, cwd: 'src' })).toMatch(/project/)
    expect(actionProblem({ ...action, session: 'existing' })).toMatch(/chat/)
    expect(actionProblem({ ...action, session: 'existing', sessionId: 4 })).toBeNull()
  })

  it('reports the first trigger problem', () => {
    const bad = { ...newTrigger('daily', '2026-11-17T09:00'), startAt: 'x' }
    expect(taskProblem({ ...valid(), triggers: [bad] })).toMatch(/start date/)
  })

  it('checks the numbers of the settings only while their option is on', () => {
    expect(settingsProblem(DEFAULT_SETTINGS)).toBeNull()
    expect(settingsProblem({ ...DEFAULT_SETTINGS, stopAfterMinutes: 0 })).toMatch(/Stop the task/)
    expect(settingsProblem({ ...DEFAULT_SETTINGS, stopIfRunsLonger: false, stopAfterMinutes: 0 })).toBeNull()
    expect(settingsProblem({ ...DEFAULT_SETTINGS, restartOnFailure: true, restartIntervalMinutes: 0 })).toMatch(/every/)
    expect(settingsProblem({ ...DEFAULT_SETTINGS, restartOnFailure: true, restartAttempts: 100 })).toMatch(/times/)
  })

  it('gives each new task its own copies of the defaults', () => {
    const a = newTaskInput('E:\\')
    a.settings.runMissed = true
    expect(newTaskInput('E:\\').settings.runMissed).toBe(false)
  })

  it('rounds up to the next full hour, over midnight and month ends', () => {
    expect(nextFullHour('2026-11-17T09:30')).toBe('2026-11-17T10:00')
    expect(nextFullHour('2026-11-17T23:59')).toBe('2026-11-18T00:00')
    expect(nextFullHour('2026-12-31T23:10')).toBe('2027-01-01T00:00')
  })
})
