/**
 * The Agent Diagrams document: pages of shapes and connectors, saved as JSON (`*.xpdiagram`).
 * Pure data, no behaviour. Coordinates are page pixels (96 per inch), origin top-left, y down.
 */

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type DashStyle = 'solid' | 'dashed' | 'dotted' | 'dash-dot'
export type TextAlign = 'left' | 'center' | 'right'
export type VerticalAlign = 'top' | 'middle' | 'bottom'

/** The look of a shape. Every field is optional on a shape: what is missing comes from the stencil, then the theme. */
export interface ShapeStyle {
  /** A CSS color, or `none`. */
  fill: string
  /** A soft top-to-bottom gradient over the fill (the Office 2010 look). */
  gradient: boolean
  stroke: string
  strokeWidth: number
  dash: DashStyle
  /** 0 to 1. */
  opacity: number
  shadow: boolean
  fontFamily: string
  fontSize: number
  fontColor: string
  bold: boolean
  italic: boolean
  underline: boolean
  textAlign: TextAlign
  verticalAlign: VerticalAlign
}

export const MARKER_KINDS = [
  'none',
  'arrow',
  'open-arrow',
  'triangle',
  'filled-triangle',
  'diamond',
  'filled-diamond',
  'circle',
  'filled-circle',
  'erd-one',
  'erd-many',
  'erd-one-only',
  'erd-zero-one',
  'erd-one-many',
  'erd-zero-many'
] as const
/**
 * The end of a connector. UML: `triangle` (generalization), `diamond` (aggregation), `filled-diamond` (composition),
 * `open-arrow` (dependency, navigation). ERD crow's foot: `erd-one` (one), `erd-many` (many), `erd-one-only` (one and only one),
 * `erd-zero-one` (zero or one), `erd-one-many` (one or many), `erd-zero-many` (zero or many).
 */
export type MarkerKind = (typeof MARKER_KINDS)[number]

export const ROUTINGS = ['orthogonal', 'straight', 'curved'] as const
export type Routing = (typeof ROUTINGS)[number]

export interface ConnectorStyle {
  stroke: string
  strokeWidth: number
  dash: DashStyle
  startMarker: MarkerKind
  endMarker: MarkerKind
  fontFamily: string
  fontSize: number
  fontColor: string
  /** Round the corners of an orthogonal route. */
  rounded: boolean
}

/** One end of a connector: glued to a shape (at a named connection point, or at the best one when `port` is absent), or free on the page. */
export type ConnectorEnd = { shape: string; port?: string } | { x: number; y: number }

export interface DiagramShape {
  id: string
  /** The stencil id, such as `flowchart.decision` or `uml.class`. */
  stencil: string
  x: number
  y: number
  w: number
  h: number
  /** Degrees clockwise around the centre. */
  rotation: number
  text: string
  style: Partial<ShapeStyle>
  /** Stencil data: the compartments of a UML class, the attributes of an ERD entity, and so on (see the stencil's `data`). */
  data?: Record<string, unknown>
  /** Shapes with the same group id move and select together. */
  groupId?: string
  locked?: boolean
}

export interface DiagramConnector {
  id: string
  from: ConnectorEnd
  to: ConnectorEnd
  routing: Routing
  /** The middle label. */
  label: string
  /** Labels next to the ends: multiplicities ("1..*"), roles. */
  startLabel?: string
  endLabel?: string
  style: Partial<ConnectorStyle>
  /** Bend points the user set on a straight connector. */
  waypoints?: Point[]
}

export interface DiagramPage {
  id: string
  name: string
  /** The paper. The visible sheet grows to hold shapes outside it when `autoSize` is on. */
  width: number
  height: number
  autoSize: boolean
  background: string
  gridSize: number
  showGrid: boolean
  /** Back to front. */
  shapes: DiagramShape[]
  connectors: DiagramConnector[]
}

export const DIAGRAM_FORMAT = 'agentxp-diagram'
export const DIAGRAM_VERSION = 1
export const DIAGRAM_EXTENSION = 'xpdiagram'

export interface DiagramDoc {
  format: typeof DIAGRAM_FORMAT
  version: typeof DIAGRAM_VERSION
  title: string
  pages: DiagramPage[]
  /** The id counter: new ids are `s<n>`, `c<n>`, `p<n>`, `g<n>`. */
  nextId: number
}

/** A shape or a connector, for selections and deletes. */
export type ItemId = string
