import { SvelteSet } from 'svelte/reactivity'
import type { Id } from '@shared/models'

/**
 * The windows whose collapsed chat strip is hidden because the app is in Focus mode (UX-153). The app adds and removes its window
 * (`CodeApp`); the window frame reads it (`AppChatPane`). The app shows its own way back to the chat in its Focus-mode bar.
 */
export const chatStripHidden = new SvelteSet<Id>()
