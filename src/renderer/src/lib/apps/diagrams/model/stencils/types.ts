import type { Side } from '../geometry'
import type { SvgNode } from '../svg'
import type { Measure } from '../text'
import type { DiagramShape, Rect, ShapeStyle } from '../types'

/** A connection point in the shape's own box (pixels from its top-left), and the way a connector leaves it. */
export interface PortDef {
  id: string
  x: number
  y: number
  dir: Side
}

export interface BodyContext {
  shape: DiagramShape
  w: number
  h: number
  style: ShapeStyle
  /** The paint for the fill: the color, `none`, or the url of the shape's gradient. */
  fill: string
  /** Stroke attributes from the style (stroke, width, dash, join). */
  line: Record<string, string | number>
  measure: Measure
}

export type StencilCategoryId =
  | 'basic'
  | 'flowchart'
  | 'uml-class'
  | 'uml-sequence'
  | 'uml-usecase'
  | 'uml-activity'
  | 'uml-state'
  | 'erd'
  | 'containers'
  | 'orgchart'
  | 'network'

export interface StencilDataDoc {
  /** For the agent: what `data` holds. */
  description: string
  defaults: Record<string, unknown>
}

export interface StencilDef {
  id: string
  name: string
  category: StencilCategoryId
  /** Words for the search box. */
  keywords?: string[]
  /** Default size. */
  w: number
  h: number
  /** Default text of a new shape. */
  text?: string
  style?: Partial<ShapeStyle>
  /** Width and height change together. */
  keepAspect?: boolean
  /** A container: drawn behind the shapes it holds, and its title sits at the top. */
  container?: boolean
  /** The body, in the shape's own box (0,0)-(w,h). */
  body(ctx: BodyContext): SvgNode[]
  /** Where the renderer puts the text; null: the stencil draws its own text. Default: the box with 6 px padding. */
  textBox?: (w: number, h: number, shape: DiagramShape) => Rect | null
  /** Connection points. Default: the middle of each side. */
  ports?: (w: number, h: number, shape: DiagramShape) => PortDef[]
  /** Extra named connection points (an ERD attribute by name, a point on a lifeline): candidates, the router picks the best. */
  namedPorts?: (shape: DiagramShape, name: string, style: ShapeStyle, measure: Measure) => PortDef[] | null
  /** The size the content needs (UML classes and ERD entities grow with their rows). */
  fit?: (shape: DiagramShape, style: ShapeStyle, measure: Measure) => { w: number; h: number }
  data?: StencilDataDoc
}

export interface StencilCategory {
  id: StencilCategoryId
  name: string
  /** The stencils shown in this category, in order (a stencil may appear in more than one). */
  stencils: string[]
}
