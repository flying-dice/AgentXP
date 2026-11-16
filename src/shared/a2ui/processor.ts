import { MessageProcessor, type ActionListener } from '@a2ui/web_core/v0_9'
import { winformsCatalog, type WinformsCatalog } from './catalog'

/**
 * Surfaces stream in: parents may arrive before their children and the root may come last, so the
 * processor tolerates dangling references, orphans and a missing root. Everything else (catalog,
 * properties, bindings, cycles, depth) stays strict.
 */
export const A2UI_STREAMING_VALIDATION = { allowDanglingReferences: true, allowOrphanComponents: true, allowMissingRoot: true } as const

/** A web_core `MessageProcessor` over the WinForms catalog, as the validator and the renderer use it. */
export function createA2uiProcessor(onAction?: ActionListener, catalog: WinformsCatalog = winformsCatalog): MessageProcessor {
  return new MessageProcessor([catalog], onAction, { validationConfig: A2UI_STREAMING_VALIDATION })
}
