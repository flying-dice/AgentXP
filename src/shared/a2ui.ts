/**
 * A2UI (Agent-to-UI) protocol types, aligned with the A2UI v0.9 message
 * shapes: an agent streams messages that create a surface, add/update a
 * flat list of components (adjacency list by id), update the surface's data
 * model, and delete the surface. Components are rendered by the renderer
 * using the AgentXP WinForms catalog (see `A2UI_CATALOG`).
 */

/** A value that is either a literal or bound to a JSON-pointer path in the data model. */
export type A2uiDynamic<T> = T | { path: string }

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
  /** Static context merged with resolved data-model values. */
  context?: Record<string, unknown>
}

export type A2uiServerMessage =
  | { createSurface: { surfaceId: string; catalogId: string; title?: string } }
  | { updateComponents: { surfaceId: string; components: A2uiComponent[] } }
  | { updateDataModel: { surfaceId: string; path?: string; value: unknown } }
  | { deleteSurface: { surfaceId: string } }

/** A user interaction sent back to the agent. */
export interface A2uiClientEvent {
  surfaceId: string
  sourceComponentId: string
  action: A2uiAction
  dataModel: unknown
  timestamp: string
}

export interface A2uiSurfaceDto {
  surfaceId: string
  sessionId: number
  title: string | null
  catalogId: string
  components: A2uiComponent[]
  dataModel: unknown
}

export const A2UI_CATALOG_ID = 'https://agentxp.dev/a2ui/catalogs/winforms/v1'
