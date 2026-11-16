import type { A2uiComponent, A2uiSurfaceDto } from '@shared/a2ui'
import type { Id } from '@shared/models'

export interface NewSurface {
  surfaceId: string
  catalogId: string
  title: string | null
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
  /** Removes the surface together with its transcript entry. */
  delete(sessionId: Id, surfaceId: string): boolean
}
