/**
 * A2UI (Agent-to-UI) contracts shared by main, preload and renderer.
 *
 * The protocol itself is the official A2UI v0.9 one, implemented by `@a2ui/web_core`: server
 * messages are its `A2uiMessage`, the catalog is `a2ui/winforms-catalog.json` (see
 * `a2ui/catalog.ts`). Only the app-specific shapes live here: the persisted surface snapshot and
 * the event sent back to the agent.
 */
import type { A2uiMessage } from '@a2ui/web_core/v0_9'

/** Id of the AgentXP WinForms catalog; equals `catalogId` in `a2ui/winforms-catalog.json`. */
export const A2UI_CATALOG_ID = 'https://agentxp.dev/a2ui/catalogs/winforms/v1'

/**
 * Where a surface is shown. `inline` draws it in the transcript (default); `sidebar` puts it in a panel
 * beside the Chat window (the chat's "extended surface", several become tabs); `window` gives it its own
 * desktop window. For the last two the transcript shows a row with Open, Close, Delete and Move to.
 */
export const A2UI_SURFACE_TARGETS = ['inline', 'sidebar', 'window'] as const
export type A2uiSurfaceTarget = (typeof A2UI_SURFACE_TARGETS)[number]

/** The agent may still say `chat` for `inline` (the first name of the parameter). */
export const normaliseSurfaceTarget = (value: unknown): A2uiSurfaceTarget | null =>
  value === 'chat' ? 'inline' : (A2UI_SURFACE_TARGETS as readonly unknown[]).includes(value) ? (value as A2uiSurfaceTarget) : null

/** An A2UI v0.9 server message: createSurface, updateComponents, updateDataModel or deleteSurface. */
export type A2uiServerMessage = A2uiMessage

export interface A2uiComponent {
  /** Unique within the surface. The root component has id "root". */
  id: string
  /** Catalog component name, e.g. "Button", "DataGridView". */
  component: string
  /** Remaining catalog-specific properties. Child references are component ids. */
  [prop: string]: unknown
}

export interface A2uiAction {
  /** Action name chosen by the agent, e.g. "submit". */
  name: string
  /** Event context with data bindings already resolved. */
  context?: Record<string, unknown>
}

/** A user interaction sent back to the agent. */
export interface A2uiClientEvent {
  /** The session that owns the surface. Optional: when omitted main looks the surface up by id. */
  sessionId?: number
  surfaceId: string
  sourceComponentId: string
  action: A2uiAction
  dataModel: unknown
  timestamp: string
}

/**
 * Persisted state of one surface. `a2uiSurfaceToMessages` turns it back into the replayable
 * message sequence (createSurface, updateComponents, updateDataModel).
 */
export interface A2uiSurfaceDto {
  surfaceId: string
  sessionId: number
  /** `createSurface.theme.title`. */
  title: string | null
  catalogId: string
  target: A2uiSurfaceTarget
  /** Sidebar surfaces only: the user closed the tab (the surface keeps updating in the background). */
  hidden: boolean
  components: A2uiComponent[]
  dataModel: unknown
}
