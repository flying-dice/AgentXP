/**
 * The tray balloon queue: one balloon is visible, the others wait their turn (`docs/AGENT_PRESENCE.md`, section 6).
 * Pure: the controller owns the timers and calls these when a balloon is shown, closed or times out.
 *
 * - A notice (`queued: true`) waits behind the balloon on screen.
 * - A balloon of the shell (the operator just did something: ejected a drive, closed a busy chat) shows at once; a
 *   notice it covers goes back to the front of the queue, so nothing the agent did is lost.
 * - A balloon with a `key` is shown once: the same key again is dropped.
 */

export interface QueuedBalloon {
  /** Identifies a notice (its id); shell balloons have none. */
  key?: string
  /** Waits for its turn instead of replacing the balloon on screen. */
  queued?: boolean
}

export interface BalloonQueueState<T extends QueuedBalloon> {
  current: T | null
  waiting: readonly T[]
}

/** At most this many balloons wait; older notices are still in the Action Center. */
export const MAX_WAITING = 20

export const emptyQueue = <T extends QueuedBalloon>(): BalloonQueueState<T> => ({ current: null, waiting: [] })

const has = <T extends QueuedBalloon>(state: BalloonQueueState<T>, key: string): boolean => state.current?.key === key || state.waiting.some((b) => b.key === key)

/** Adds a balloon: shown now when nothing is, or when it is the shell's; otherwise it waits at the end. */
export function push<T extends QueuedBalloon>(state: BalloonQueueState<T>, balloon: T): BalloonQueueState<T> {
  if (balloon.key !== undefined && has(state, balloon.key)) return state
  if (state.current === null) return { current: balloon, waiting: state.waiting }
  if (!balloon.queued) {
    // The shell speaks now; a notice on screen waits again (first in line). A shell balloon it replaces is done.
    const back = state.current.queued ? [state.current] : []
    return { current: balloon, waiting: [...back, ...state.waiting].slice(0, MAX_WAITING) }
  }
  return { current: state.current, waiting: [...state.waiting, balloon].slice(-MAX_WAITING) }
}

/** The balloon on screen is done (closed, timed out, its button used): the next one waiting shows. */
export function next<T extends QueuedBalloon>(state: BalloonQueueState<T>): BalloonQueueState<T> {
  const [first, ...rest] = state.waiting
  return { current: first ?? null, waiting: rest }
}

/** Removes every balloon that matches (on screen or waiting); the next one waiting shows if the one on screen went. */
export function drop<T extends QueuedBalloon>(state: BalloonQueueState<T>, match: (balloon: T) => boolean): BalloonQueueState<T> {
  const waiting = state.waiting.filter((b) => !match(b))
  if (state.current !== null && match(state.current)) return next({ current: null, waiting })
  return { current: state.current, waiting }
}

/** "2 more" under the balloon on screen; null when none wait. */
export function moreText(state: BalloonQueueState<QueuedBalloon>): string | null {
  return state.waiting.length > 0 ? `${state.waiting.length} more` : null
}
