/**
 * Framework-neutral bridge helpers over web_core's signals (`@preact/signals-core` behind
 * web_core's `effect` / `getValue`). The Svelte side lives in `signals.svelte.ts`.
 */
import { effect, getValue, type Signal } from '@a2ui/web_core/v0_9'

/**
 * Calls `onChange` with the new value every time `source` changes (not for its current value).
 * Returns the unsubscribe function.
 */
export function subscribeSignal<T>(source: Signal<T>, onChange: (value: T) => void): () => void {
  let initial = true
  return effect(() => {
    const value = getValue(source)
    if (initial) {
      initial = false
      return
    }
    onChange(value)
  })
}
