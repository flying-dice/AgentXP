/** Svelte 5 adapter for web_core signals: a signal read becomes a Svelte reactive read. */
import { peekValue, type Signal } from '@a2ui/web_core/v0_9'
import { subscribeSignal } from './signals'

/**
 * Reactive view of a signal. `getSignal` is re-evaluated reactively, so passing a getter over a
 * prop follows the prop when it changes. Call during component initialisation.
 */
export function useSignal<T>(getSignal: () => Signal<T>): { readonly current: T } {
  let value = $state.raw(peekValue(getSignal()))
  $effect(() => {
    const source = getSignal()
    value = peekValue(source)
    return subscribeSignal(source, (next) => {
      value = next
    })
  })
  return {
    get current() {
      return value
    }
  }
}
