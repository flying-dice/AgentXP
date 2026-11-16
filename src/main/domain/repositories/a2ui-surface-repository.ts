import type { A2uiComponent, A2uiSurfaceDto, A2uiSurfaceTarget } from '@shared/a2ui'
import type { Id } from '@shared/models'

export interface NewSurface {
  surfaceId: string
  catalogId: string
  title: string | null
  /** Used when the surface is new; re-creating an id keeps the stored target. */
  target?: A2uiSurfaceTarget
}

export interface A2uiSurfaceRepository {
  /** Creates the surface and its transcript entry; re-creating an id updates catalog/title only. */
  create(sessionId: Id, input: NewSurface): A2uiSurfaceDto
  get(sessionId: Id, surfaceId: string): A2uiSurfaceDto | null
  list(sessionId: Id): A2uiSurfaceDto[]
  /** Inserts new components and overwrites existing ones by id. Null when the surface is unknown. */
  upsertComponents(sessionId: Id, surfaceId: string, components: A2uiComponent[]): A2uiSurfaceDto | null
  /** Writes `value` at the JSON pointer `path` (whole model when omitted or empty). */
  updateDataModel(sessionId: Id, surfaceId: string, path: string | undefined, value: unknown): A2uiSurfaceDto | null
  /** Moves the surface to another place (a sidebar surface comes back visible). Null when unknown. */
  setTarget(sessionId: Id, surfaceId: string, target: A2uiSurfaceTarget): A2uiSurfaceDto | null
  /** The user closed (true) or reopened (false) the sidebar tab. Null when unknown. */
  setHidden(sessionId: Id, surfaceId: string, hidden: boolean): A2uiSurfaceDto | null
  /** Removes the surface together with its transcript entry. */
  delete(sessionId: Id, surfaceId: string): boolean
}
