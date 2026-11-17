/** The stencil catalog: every shape the app and the agent can place, grouped as the Shapes pane shows them. */
import { BASIC_STENCILS } from './basic'
import { ERD_STENCILS } from './erd'
import { FLOWCHART_STENCILS } from './flowchart'
import { CONTAINER_STENCILS, NETWORK_STENCILS, ORGCHART_STENCILS } from './more'
import type { StencilCategory, StencilDef } from './types'
import { UML_STENCILS } from './uml'

export const ALL_STENCILS: readonly StencilDef[] = [...BASIC_STENCILS, ...FLOWCHART_STENCILS, ...UML_STENCILS, ...ERD_STENCILS, ...CONTAINER_STENCILS, ...ORGCHART_STENCILS, ...NETWORK_STENCILS]

const BY_ID = new Map(ALL_STENCILS.map((s) => [s.id, s]))

const idsOf = (category: StencilDef['category']): string[] => ALL_STENCILS.filter((s) => s.category === category).map((s) => s.id)

export const STENCIL_CATEGORIES: readonly StencilCategory[] = [
  { id: 'basic', name: 'Basic Shapes', stencils: idsOf('basic') },
  { id: 'flowchart', name: 'Flowchart', stencils: idsOf('flowchart') },
  { id: 'uml-class', name: 'UML Class', stencils: idsOf('uml-class') },
  { id: 'uml-sequence', name: 'UML Sequence', stencils: [...idsOf('uml-sequence'), 'uml.note'] },
  { id: 'uml-usecase', name: 'UML Use Case', stencils: [...idsOf('uml-usecase'), 'uml.note'] },
  { id: 'uml-activity', name: 'UML Activity', stencils: [...idsOf('uml-activity'), 'uml.note'] },
  { id: 'uml-state', name: 'UML State', stencils: ['uml.initial', ...idsOf('uml-state'), 'uml.final', 'uml.note'] },
  { id: 'erd', name: 'Entity Relationship', stencils: idsOf('erd') },
  { id: 'containers', name: 'Containers and Swimlanes', stencils: idsOf('containers') },
  { id: 'orgchart', name: 'Org Chart', stencils: idsOf('orgchart') },
  { id: 'network', name: 'Network', stencils: idsOf('network') }
]

/** The stand-in for a stencil id the catalog does not know (a file from a newer version): a plain rectangle. */
export const FALLBACK_STENCIL: StencilDef = BY_ID.get('basic.rectangle')!

export const stencilById = (id: string): StencilDef | undefined => BY_ID.get(id)
export const stencilOf = (id: string): StencilDef => BY_ID.get(id) ?? FALLBACK_STENCIL
export const isStencilId = (id: string): boolean => BY_ID.has(id)

/** Stencils whose name, id or keywords contain every word of the query. */
export function searchStencils(query: string, category?: string): StencilDef[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const pool = category ? (STENCIL_CATEGORIES.find((c) => c.id === category)?.stencils ?? []).map((id) => BY_ID.get(id)!).filter(Boolean) : ALL_STENCILS
  if (words.length === 0) return [...pool]
  return pool.filter((s) => {
    const hay = `${s.id} ${s.name} ${(s.keywords ?? []).join(' ')}`.toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}

/** The closest stencil ids to an unknown id (for a helpful error). */
export function suggestStencils(id: string, limit = 5): string[] {
  const tail = id.toLowerCase().split(/[.\-_\s]/).filter(Boolean)
  const scored = ALL_STENCILS.map((s) => {
    const hay = `${s.id} ${s.name} ${(s.keywords ?? []).join(' ')}`.toLowerCase()
    return { id: s.id, score: tail.filter((t) => hay.includes(t)).length }
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.id)
}
