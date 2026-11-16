import type { AguiSessionState, AguiToolCallState } from '@shared/agui-state'

const OPEN: ReadonlySet<string> = new Set(['pending', 'in_progress'])

/**
 * A step that is still "Running" while no turn runs belongs to a turn that was cut off (a crash, an ended agent program): nothing is
 * working on it any more. It shows as Cancelled, so the old attempt does not look alive next to the repeat (UX-201).
 * Returns the same object when no step needs it.
 */
export function settleStaleSteps(state: AguiSessionState, running: boolean, waiting: boolean): AguiSessionState {
  if (running || waiting) return state
  const entries = Object.entries(state.toolCalls)
  if (!entries.some(([, call]) => OPEN.has(call.status))) return state
  const toolCalls: Record<string, AguiToolCallState> = {}
  for (const [id, call] of entries) toolCalls[id] = OPEN.has(call.status) ? { ...call, status: 'cancelled' } : call
  return { ...state, toolCalls }
}
