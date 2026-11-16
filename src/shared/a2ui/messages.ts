import type { A2uiServerMessage, A2uiSurfaceDto } from '../a2ui'

/** Protocol version written into every message Agent7 produces. */
export const A2UI_VERSION = 'v0.9'

const isEmptyModel = (model: unknown): boolean =>
  model === undefined || model === null || (typeof model === 'object' && Object.keys(model).length === 0)

/**
 * The replayable message sequence of a persisted surface: createSurface, updateComponents (when it
 * has components) and updateDataModel (when its data model is not empty). Feeding it to a fresh
 * `MessageProcessor` rebuilds the surface; the AG-UI layer sends it as ACTIVITY_SNAPSHOT content.
 */
export function a2uiSurfaceToMessages(surface: A2uiSurfaceDto): A2uiServerMessage[] {
  const { surfaceId } = surface
  const messages: A2uiServerMessage[] = [
    {
      version: A2UI_VERSION,
      createSurface: {
        surfaceId,
        catalogId: surface.catalogId,
        ...(surface.title === null ? {} : { theme: { title: surface.title } })
      }
    }
  ]
  if (surface.components.length > 0) {
    messages.push({ version: A2UI_VERSION, updateComponents: { surfaceId, components: surface.components } })
  }
  if (!isEmptyModel(surface.dataModel)) {
    messages.push({ version: A2UI_VERSION, updateDataModel: { surfaceId, value: surface.dataModel } })
  }
  return messages
}

/** The title a createSurface message gives its surface (`theme.title`), or null. */
export function surfaceTitle(createSurface: { theme?: unknown }): string | null {
  const theme = createSurface.theme
  if (typeof theme !== 'object' || theme === null) return null
  const title = (theme as { title?: unknown }).title
  return typeof title === 'string' && title !== '' ? title : null
}

/** Smallest and largest window a size hint may ask for (CSS px). */
const HINT_LIMITS = { width: [240, 900], height: [160, 640] } as const

/**
 * The window size a surface asks for with `theme.width` / `theme.height` (the catalog theme allows extra
 * properties). Missing or invalid values are left out; the caller falls back to its default.
 */
export function surfaceSizeHint(createSurface: { theme?: unknown }): { width?: number; height?: number } {
  const theme = createSurface.theme
  if (typeof theme !== 'object' || theme === null) return {}
  const out: { width?: number; height?: number } = {}
  for (const key of ['width', 'height'] as const) {
    const value = (theme as Record<string, unknown>)[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      const [lo, hi] = HINT_LIMITS[key]
      out[key] = Math.round(Math.min(hi, Math.max(lo, value)))
    }
  }
  return out
}
