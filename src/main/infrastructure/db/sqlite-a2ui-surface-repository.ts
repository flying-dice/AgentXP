import type { Database, Statement } from 'better-sqlite3'
import type { A2uiComponent, A2uiSurfaceDto } from '@shared/a2ui'
import type { Id } from '@shared/models'
import { setAtPointer } from '../../domain/json-pointer'
import type { A2uiSurfaceRepository, NewSurface } from '../../domain/repositories/a2ui-surface-repository'
import { TranscriptEntries } from './transcript-entries'

interface SurfaceRow {
  id: number
  session_id: number
  surface_id: string
  title: string | null
  catalog_id: string
  data_model: string
}

interface ComponentRow {
  component_id: string
  component: string
  props: string
}

interface ComponentParams {
  surfaceRowId: Id
  componentId: string
  component: string
  props: string
}

const COLUMNS = 'id, session_id, surface_id, title, catalog_id, data_model'

/** Component props are catalog-defined and schemaless, hence JSON text (see migration notes). */
function splitComponent(c: A2uiComponent): { component: string; props: string } {
  const { id: _id, component, ...props } = c
  return { component, props: JSON.stringify(props) }
}

function joinComponent(row: ComponentRow): A2uiComponent {
  return { ...(JSON.parse(row.props) as Record<string, unknown>), id: row.component_id, component: row.component }
}

export class SqliteA2uiSurfaceRepository implements A2uiSurfaceRepository {
  private readonly entries: TranscriptEntries
  private readonly selectOne: Statement<[Id, string], SurfaceRow>
  private readonly selectBySession: Statement<[Id], SurfaceRow>
  private readonly selectComponents: Statement<[Id], ComponentRow>
  private readonly insertSurface: Statement<[Id, Id, string, string | null, string]>
  private readonly updateSurface: Statement<[string | null, string, Id]>
  private readonly updateModel: Statement<[string, Id]>
  private readonly upsertComponent: Statement<ComponentParams>
  private readonly selectEntryId: Statement<[Id], { entry_id: number }>

  constructor(private readonly db: Database) {
    this.entries = new TranscriptEntries(db)
    this.selectOne = db.prepare(`SELECT ${COLUMNS} FROM a2ui_surfaces WHERE session_id = ? AND surface_id = ?`)
    this.selectBySession = db.prepare(
      `SELECT ${COLUMNS} FROM a2ui_surfaces s WHERE session_id = ?
       ORDER BY (SELECT seq FROM transcript_entries e WHERE e.id = s.entry_id)`
    )
    this.selectComponents = db.prepare(
      'SELECT component_id, component, props FROM a2ui_components WHERE surface_id = ? ORDER BY position'
    )
    this.insertSurface = db.prepare(
      'INSERT INTO a2ui_surfaces (entry_id, session_id, surface_id, title, catalog_id) VALUES (?, ?, ?, ?, ?)'
    )
    this.updateSurface = db.prepare('UPDATE a2ui_surfaces SET title = ?, catalog_id = ? WHERE id = ?')
    this.updateModel = db.prepare('UPDATE a2ui_surfaces SET data_model = ? WHERE id = ?')
    this.upsertComponent = db.prepare(
      `INSERT INTO a2ui_components (surface_id, position, component_id, component, props)
       VALUES (@surfaceRowId,
               (SELECT COALESCE(MAX(position), -1) + 1 FROM a2ui_components WHERE surface_id = @surfaceRowId),
               @componentId, @component, @props)
       ON CONFLICT (surface_id, component_id) DO UPDATE SET component = excluded.component, props = excluded.props`
    )
    this.selectEntryId = db.prepare('SELECT entry_id FROM a2ui_surfaces WHERE id = ?')
  }

  create(sessionId: Id, input: NewSurface): A2uiSurfaceDto {
    this.db.transaction(() => {
      const existing = this.selectOne.get(sessionId, input.surfaceId)
      if (existing) {
        this.updateSurface.run(input.title, input.catalogId, existing.id)
        return
      }
      const entryId = this.entries.allocate(sessionId, 'a2ui')
      this.insertSurface.run(entryId, sessionId, input.surfaceId, input.title, input.catalogId)
    })()
    return this.require(sessionId, input.surfaceId)
  }

  get(sessionId: Id, surfaceId: string): A2uiSurfaceDto | null {
    const row = this.selectOne.get(sessionId, surfaceId)
    return row ? this.toDto(row) : null
  }

  list(sessionId: Id): A2uiSurfaceDto[] {
    return this.selectBySession.all(sessionId).map((row) => this.toDto(row))
  }

  upsertComponents(sessionId: Id, surfaceId: string, components: A2uiComponent[]): A2uiSurfaceDto | null {
    const row = this.selectOne.get(sessionId, surfaceId)
    if (!row) return null
    this.db.transaction(() => {
      for (const c of components) {
        this.upsertComponent.run({ surfaceRowId: row.id, componentId: c.id, ...splitComponent(c) })
      }
    })()
    return this.get(sessionId, surfaceId)
  }

  updateDataModel(sessionId: Id, surfaceId: string, path: string | undefined, value: unknown): A2uiSurfaceDto | null {
    return this.db.transaction(() => {
      const row = this.selectOne.get(sessionId, surfaceId)
      if (!row) return null
      const next = setAtPointer(JSON.parse(row.data_model), path, value)
      this.updateModel.run(JSON.stringify(next ?? null), row.id)
      return this.get(sessionId, surfaceId)
    })()
  }

  delete(sessionId: Id, surfaceId: string): boolean {
    return this.db.transaction(() => {
      const row = this.selectOne.get(sessionId, surfaceId)
      const entry = row ? this.selectEntryId.get(row.id) : undefined
      if (!entry) return false
      this.entries.delete(entry.entry_id)
      return true
    })()
  }

  private require(sessionId: Id, surfaceId: string): A2uiSurfaceDto {
    const surface = this.get(sessionId, surfaceId)
    if (!surface) throw new Error(`Surface ${surfaceId} vanished after write`)
    return surface
  }

  private toDto(row: SurfaceRow): A2uiSurfaceDto {
    return {
      surfaceId: row.surface_id,
      sessionId: row.session_id,
      title: row.title,
      catalogId: row.catalog_id,
      components: this.selectComponents.all(row.id).map(joinComponent),
      dataModel: JSON.parse(row.data_model) as unknown
    }
  }
}
