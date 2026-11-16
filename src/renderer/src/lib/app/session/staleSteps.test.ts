import { describe, expect, it } from 'vitest'
import { emptyAguiState, type AguiToolCallState } from '@shared/agui-state'
import { settleStaleSteps } from './staleSteps'

const call = (status: AguiToolCallState['status']): AguiToolCallState => ({ title: 'Run a command', kind: 'execute', status, rawInput: null, locations: [], contents: [] })
const stateWith = (...statuses: AguiToolCallState['status'][]): ReturnType<typeof emptyAguiState> => ({ ...emptyAguiState(), toolCalls: Object.fromEntries(statuses.map((s, i) => [`t${i}`, call(s)])) })

describe('settleStaleSteps (UX-201)', () => {
  it('shows a step that is still running, while no turn runs, as cancelled', () => {
    const settled = settleStaleSteps(stateWith('in_progress', 'completed', 'pending'), false, false)
    expect(Object.values(settled.toolCalls).map((c) => c.status)).toEqual(['cancelled', 'completed', 'cancelled'])
  })
  it('leaves the steps of a turn that runs, or that waits for the answer, as they are', () => {
    const state = stateWith('in_progress')
    expect(settleStaleSteps(state, true, false)).toBe(state)
    expect(settleStaleSteps(state, false, true)).toBe(state)
  })
  it('returns the same state when nothing is open', () => {
    const state = stateWith('completed', 'failed')
    expect(settleStaleSteps(state, false, false)).toBe(state)
  })
})
