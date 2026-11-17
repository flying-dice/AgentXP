/** Connector presets: the named line kinds of each notation (a UML generalization, an ERD one-to-many, a flowchart flow). */
import type { ConnectorStyle, Routing } from './types'

export interface ConnectorPreset {
  id: string
  name: string
  group: 'General' | 'UML' | 'ERD'
  routing: Routing
  style: Partial<ConnectorStyle>
  /** A label the preset puts on the line («include»). */
  label?: string
  description: string
}

const UML_LINE = { stroke: '#2a3a50' }

export const CONNECTOR_PRESETS: readonly ConnectorPreset[] = [
  { id: 'flow', name: 'Flow', group: 'General', routing: 'orthogonal', style: { startMarker: 'none', endMarker: 'arrow' }, description: 'A right-angle line with an arrow (flowcharts, processes).' },
  { id: 'line', name: 'Line', group: 'General', routing: 'straight', style: { startMarker: 'none', endMarker: 'none' }, description: 'A straight line with no arrow.' },
  { id: 'arrow', name: 'Arrow', group: 'General', routing: 'straight', style: { startMarker: 'none', endMarker: 'arrow' }, description: 'A straight line with an arrow.' },
  { id: 'double-arrow', name: 'Double arrow', group: 'General', routing: 'straight', style: { startMarker: 'arrow', endMarker: 'arrow' }, description: 'A straight line with arrows at both ends.' },
  { id: 'curved', name: 'Curved arrow', group: 'General', routing: 'curved', style: { startMarker: 'none', endMarker: 'arrow' }, description: 'A curve with an arrow (mind maps, loose sketches).' },
  { id: 'elbow', name: 'Right-angle line', group: 'General', routing: 'orthogonal', style: { startMarker: 'none', endMarker: 'none' }, description: 'A right-angle line with no arrow (org charts, trees).' },
  { id: 'dashed', name: 'Dashed arrow', group: 'General', routing: 'orthogonal', style: { dash: 'dashed', startMarker: 'none', endMarker: 'open-arrow' }, description: 'A dashed right-angle line with an open arrow.' },

  { id: 'uml.association', name: 'Association', group: 'UML', routing: 'straight', style: { ...UML_LINE, startMarker: 'none', endMarker: 'none' }, description: 'UML association: a plain line. Put multiplicities in startLabel and endLabel.' },
  { id: 'uml.directed-association', name: 'Directed association', group: 'UML', routing: 'straight', style: { ...UML_LINE, startMarker: 'none', endMarker: 'open-arrow' }, description: 'UML navigable association: an open arrow at the target.' },
  { id: 'uml.inheritance', name: 'Inheritance', group: 'UML', routing: 'orthogonal', style: { ...UML_LINE, startMarker: 'none', endMarker: 'triangle' }, description: 'UML generalization: from the subclass to the superclass, hollow triangle at the superclass.' },
  { id: 'uml.realization', name: 'Realization', group: 'UML', routing: 'orthogonal', style: { ...UML_LINE, dash: 'dashed', startMarker: 'none', endMarker: 'triangle' }, description: 'UML realization: from the class to the interface it implements, dashed with a hollow triangle.' },
  { id: 'uml.dependency', name: 'Dependency', group: 'UML', routing: 'straight', style: { ...UML_LINE, dash: 'dashed', startMarker: 'none', endMarker: 'open-arrow' }, description: 'UML dependency: dashed with an open arrow at the thing depended on.' },
  { id: 'uml.aggregation', name: 'Aggregation', group: 'UML', routing: 'straight', style: { ...UML_LINE, startMarker: 'diamond', endMarker: 'none' }, description: 'UML aggregation: from the whole to the part, hollow diamond at the whole.' },
  { id: 'uml.composition', name: 'Composition', group: 'UML', routing: 'straight', style: { ...UML_LINE, startMarker: 'filled-diamond', endMarker: 'none' }, description: 'UML composition: from the whole to the part, filled diamond at the whole.' },
  { id: 'uml.message', name: 'Synchronous message', group: 'UML', routing: 'straight', style: { ...UML_LINE, startMarker: 'none', endMarker: 'arrow' }, description: 'Sequence diagram call: a solid line with a filled arrow. Give the connector a y so it runs level between lifelines.' },
  { id: 'uml.async-message', name: 'Asynchronous message', group: 'UML', routing: 'straight', style: { ...UML_LINE, startMarker: 'none', endMarker: 'open-arrow' }, description: 'Sequence diagram signal: a solid line with an open arrow.' },
  { id: 'uml.return', name: 'Return message', group: 'UML', routing: 'straight', style: { ...UML_LINE, dash: 'dashed', startMarker: 'none', endMarker: 'open-arrow' }, description: 'Sequence diagram reply: dashed with an open arrow.' },
  { id: 'uml.include', name: 'Include', group: 'UML', routing: 'straight', style: { ...UML_LINE, dash: 'dashed', startMarker: 'none', endMarker: 'open-arrow' }, label: '«include»', description: 'Use case include: dashed open arrow labelled «include», from the base use case to the included one.' },
  { id: 'uml.extend', name: 'Extend', group: 'UML', routing: 'straight', style: { ...UML_LINE, dash: 'dashed', startMarker: 'none', endMarker: 'open-arrow' }, label: '«extend»', description: 'Use case extend: dashed open arrow labelled «extend», from the extension to the base use case.' },
  { id: 'uml.transition', name: 'Transition', group: 'UML', routing: 'orthogonal', style: { ...UML_LINE, startMarker: 'none', endMarker: 'open-arrow', rounded: true }, description: 'State or activity flow: an open arrow. Put "event [guard] / action" in the label.' },
  { id: 'uml.note-link', name: 'Note link', group: 'UML', routing: 'straight', style: { ...UML_LINE, dash: 'dashed', startMarker: 'none', endMarker: 'none' }, description: 'Attaches a note to an element: a dashed line.' },

  { id: 'erd.one-to-one', name: 'One to one', group: 'ERD', routing: 'orthogonal', style: { startMarker: 'erd-one-only', endMarker: 'erd-one-only' }, description: "Crow's foot: exactly one at each end." },
  { id: 'erd.one-to-many', name: 'One to many', group: 'ERD', routing: 'orthogonal', style: { startMarker: 'erd-one-only', endMarker: 'erd-zero-many' }, description: "Crow's foot: from the parent (exactly one) to the child (zero or many). Glue the ends to attribute rows with fromPort/toPort." },
  { id: 'erd.one-to-one-or-many', name: 'One to one or many', group: 'ERD', routing: 'orthogonal', style: { startMarker: 'erd-one-only', endMarker: 'erd-one-many' }, description: "Crow's foot: exactly one to one or many." },
  { id: 'erd.zero-or-one', name: 'One to zero or one', group: 'ERD', routing: 'orthogonal', style: { startMarker: 'erd-one-only', endMarker: 'erd-zero-one' }, description: "Crow's foot: exactly one to zero or one." },
  { id: 'erd.many-to-many', name: 'Many to many', group: 'ERD', routing: 'orthogonal', style: { startMarker: 'erd-zero-many', endMarker: 'erd-zero-many' }, description: "Crow's foot: zero or many at each end (usually split with a join table)." },
  { id: 'erd.chen', name: 'Chen line', group: 'ERD', routing: 'straight', style: { startMarker: 'none', endMarker: 'none' }, description: 'Chen notation: a plain line between an entity, a relationship or an attribute. Put the cardinality (1, N, M) in a label.' }
]

const BY_ID = new Map(CONNECTOR_PRESETS.map((p) => [p.id, p]))
export const presetById = (id: string): ConnectorPreset | undefined => BY_ID.get(id)
