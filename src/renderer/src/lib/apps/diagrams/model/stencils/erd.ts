/** Entity Relationship: crow's foot entities with typed attributes, and the Chen notation shapes. */
import { n, type SvgNode } from '../svg'
import { fontOf, lineHeight, textLine, type Measure } from '../text'
import { luminance } from '../style'
import type { DiagramShape, ShapeStyle } from '../types'
import { ellipseEl, manyPorts, polyEl, rectEl, strokeEl } from './kit'
import type { PortDef, StencilDef } from './types'

export interface ErdAttribute {
  name: string
  type: string
  /** PK, FK, "PK, FK", UK or empty. */
  key: string
  required: boolean
}

/** Reads `data.attributes`: objects, or strings such as "PK id int", "FK customer_id int", "email varchar(80) NOT NULL". */
export function erdAttributes(shape: Pick<DiagramShape, 'data'>): ErdAttribute[] {
  const raw = shape.data?.['attributes']
  if (!Array.isArray(raw)) return []
  return raw.flatMap((a): ErdAttribute[] => {
    if (typeof a === 'string') {
      const words = a.trim().split(/\s+/)
      if (!words[0]) return []
      let key = ''
      const upper = words[0].toUpperCase().replace(/[,]$/, '')
      if (['PK', 'FK', 'UK', 'PK/FK', 'PK,FK'].includes(upper)) {
        key = upper === 'PK/FK' || upper === 'PK,FK' ? 'PK, FK' : upper
        words.shift()
      }
      const rest = words.join(' ')
      const required = /\bnot null\b/i.test(rest)
      const [name = '', ...type] = rest.replace(/\bnot null\b/i, '').trim().split(/\s+/)
      return name ? [{ name, type: type.join(' '), key, required }] : []
    }
    if (a && typeof a === 'object') {
      const o = a as Record<string, unknown>
      const name = typeof o['name'] === 'string' ? o['name'] : ''
      if (!name) return []
      const key = typeof o['key'] === 'string' ? o['key'].toUpperCase() : o['pk'] === true && o['fk'] === true ? 'PK, FK' : o['pk'] === true ? 'PK' : o['fk'] === true ? 'FK' : ''
      return [{ name, type: typeof o['type'] === 'string' ? o['type'] : '', key: key === 'PK,FK' || key === 'PK/FK' ? 'PK, FK' : key, required: o['required'] === true || o['nullable'] === false }]
    }
    return []
  })
}

const HEADER = 28
const KEY_COL = 34
const rowHeight = (style: ShapeStyle): number => lineHeight(style.fontSize) + 5

/** Primary key rows first, the rest after a line. */
const ordered = (attrs: ErdAttribute[]): ErdAttribute[] => [...attrs.filter((a) => a.key.includes('PK')), ...attrs.filter((a) => !a.key.includes('PK'))]

function entityFit(shape: DiagramShape, style: ShapeStyle, measure: Measure): { w: number; h: number } {
  const attrs = erdAttributes(shape)
  const font = fontOf(style)
  const nameW = Math.max(0, ...attrs.map((a) => measure(a.name, font)))
  const typeW = Math.max(0, ...attrs.map((a) => measure(a.type, { ...font, size: font.size - 1 })))
  const titleW = measure(shape.text, { ...font, bold: true }) + 24
  return { w: Math.ceil(Math.max(160, titleW, KEY_COL + nameW + typeW + 28)), h: Math.ceil(HEADER + Math.max(1, attrs.length) * rowHeight(style) + 6) }
}

function entityRowY(style: ShapeStyle, index: number): number {
  return HEADER + 3 + rowHeight(style) * index + rowHeight(style) / 2
}

const ENTITY: StencilDef = {
  id: 'erd.entity',
  name: 'Entity (table)',
  category: 'erd',
  keywords: ['table', 'entity', 'crow', 'database', 'schema'],
  w: 180,
  h: 120,
  text: 'Entity',
  style: { fill: '#4a78b5', stroke: '#2f5487', fontSize: 11, gradient: true },
  body: (c) => {
    const s = c.style
    const attrs = ordered(erdAttributes(c.shape))
    const rh = rowHeight(s)
    const font = fontOf(s)
    const headText = luminance(s.fill.startsWith('#') ? s.fill : '#ffffff') < 0.55 ? '#ffffff' : s.fontColor
    const out: SvgNode[] = [
      rectEl(c, 0, 0, c.w, c.h, 3, { fill: '#ffffff' }),
      rectEl(c, 0, 0, c.w, HEADER, 3),
      textLine(c.shape.text, c.w / 2, HEADER / 2 + s.fontSize * 0.38, { ...font, bold: true }, headText, 'middle'),
      strokeEl(c, `M${n(KEY_COL)} ${n(HEADER)} L${n(KEY_COL)} ${n(c.h)}`, { 'stroke-width': 0.75 })
    ]
    const pkCount = attrs.filter((a) => a.key.includes('PK')).length
    attrs.forEach((a, i) => {
      const y = HEADER + 3 + rh * i
      const base = y + rh / 2 + s.fontSize * 0.36
      if (i === pkCount && pkCount > 0) out.push(strokeEl(c, `M0 ${n(y - 1.5)} L${n(c.w)} ${n(y - 1.5)}`, { 'stroke-width': 0.75 }))
      if (a.key) out.push(textLine(a.key, KEY_COL / 2, base, { ...font, size: s.fontSize - 2, bold: true }, a.key.includes('PK') ? '#9a6a00' : '#3a6aa5', 'middle'))
      out.push(textLine(a.name, KEY_COL + 6, base, { ...font, bold: a.key.includes('PK') }, s.fontColor, 'start', a.key.includes('PK') ? { 'text-decoration': 'underline' } : {}))
      if (a.type) out.push(textLine(a.type + (a.required ? '' : ''), c.w - 6, base, { ...font, size: s.fontSize - 1 }, '#5f6f86', 'end'))
    })
    return out
  },
  textBox: () => null,
  ports: (w, h) => [...manyPorts(w, h)],
  namedPorts: (shape, name, style) => {
    const attrs = ordered(erdAttributes(shape))
    const index = attrs.findIndex((a) => a.name.toLowerCase() === name.toLowerCase())
    if (index < 0) return null
    const y = entityRowY(style, index)
    return [
      { id: name, x: 0, y, dir: 'w' },
      { id: name, x: shape.w, y, dir: 'e' }
    ] satisfies PortDef[]
  },
  fit: entityFit,
  data: {
    description:
      'attributes: a list of { name, type, key ("PK", "FK", "PK, FK", "UK" or ""), required } or strings such as "PK id int", "FK customer_id int", "email varchar(120) NOT NULL". Primary keys are listed first. The text is the entity (table) name. A connector port may be an attribute name: the connector then meets that row.',
    defaults: { attributes: [{ name: 'id', type: 'int', key: 'PK' }] }
  }
}

export const ERD_STENCILS: StencilDef[] = [
  ENTITY,
  {
    ...ENTITY,
    id: 'erd.view',
    name: 'View',
    keywords: ['view', 'query'],
    text: 'View',
    style: { ...ENTITY.style, fill: '#6f8fb8', dash: 'dashed' }
  },
  {
    id: 'erd.chen-entity',
    name: 'Entity (Chen)',
    category: 'erd',
    keywords: ['chen', 'entity'],
    w: 120,
    h: 56,
    text: 'Entity',
    body: (c) => [rectEl(c, 0, 0, c.w, c.h)]
  },
  {
    id: 'erd.weak-entity',
    name: 'Weak entity',
    category: 'erd',
    keywords: ['chen', 'weak'],
    w: 120,
    h: 56,
    text: 'Weak entity',
    body: (c) => [rectEl(c, 0, 0, c.w, c.h), rectEl(c, 4, 4, c.w - 8, c.h - 8, 0, { fill: 'none' })],
    textBox: (w, h) => ({ x: 8, y: 8, w: w - 16, h: h - 16 })
  },
  {
    id: 'erd.relationship',
    name: 'Relationship',
    category: 'erd',
    keywords: ['chen', 'relationship', 'diamond'],
    w: 120,
    h: 70,
    text: 'has',
    body: (c) => [polyEl(c, [[c.w / 2, 0], [c.w, c.h / 2], [c.w / 2, c.h], [0, c.h / 2]])],
    textBox: (w, h) => ({ x: w * 0.2, y: h * 0.2, w: w * 0.6, h: h * 0.6 })
  },
  {
    id: 'erd.identifying-relationship',
    name: 'Identifying relationship',
    category: 'erd',
    keywords: ['chen', 'identifying', 'weak relationship'],
    w: 130,
    h: 76,
    text: 'owns',
    body: (c) => [
      polyEl(c, [[c.w / 2, 0], [c.w, c.h / 2], [c.w / 2, c.h], [0, c.h / 2]]),
      polyEl(c, [[c.w / 2, 7], [c.w - 12, c.h / 2], [c.w / 2, c.h - 7], [12, c.h / 2]], { fill: 'none' })
    ],
    textBox: (w, h) => ({ x: w * 0.25, y: h * 0.25, w: w * 0.5, h: h * 0.5 })
  },
  {
    id: 'erd.attribute',
    name: 'Attribute',
    category: 'erd',
    keywords: ['chen', 'attribute', 'property', 'field'],
    w: 110,
    h: 46,
    text: 'attribute',
    style: { fill: '#ffffff', gradient: false },
    body: (c) => [ellipseEl(c, c.w / 2, c.h / 2, c.w / 2, c.h / 2)],
    textBox: (w, h) => ({ x: w * 0.1, y: 4, w: w * 0.8, h: h - 8 })
  },
  {
    id: 'erd.key-attribute',
    name: 'Key attribute',
    category: 'erd',
    keywords: ['chen', 'key', 'primary key', 'identifier'],
    w: 110,
    h: 46,
    text: 'id',
    style: { fill: '#ffffff', gradient: false, underline: true },
    body: (c) => [ellipseEl(c, c.w / 2, c.h / 2, c.w / 2, c.h / 2)],
    textBox: (w, h) => ({ x: w * 0.1, y: 4, w: w * 0.8, h: h - 8 })
  },
  {
    id: 'erd.multivalued-attribute',
    name: 'Multivalued attribute',
    category: 'erd',
    keywords: ['chen', 'multivalued', 'list'],
    w: 120,
    h: 50,
    text: 'phones',
    style: { fill: '#ffffff', gradient: false },
    body: (c) => [ellipseEl(c, c.w / 2, c.h / 2, c.w / 2, c.h / 2), ellipseEl(c, c.w / 2, c.h / 2, c.w / 2 - 5, c.h / 2 - 5, { fill: 'none' })],
    textBox: (w, h) => ({ x: w * 0.14, y: 6, w: w * 0.72, h: h - 12 })
  },
  {
    id: 'erd.derived-attribute',
    name: 'Derived attribute',
    category: 'erd',
    keywords: ['chen', 'derived', 'computed'],
    w: 110,
    h: 46,
    text: 'age',
    style: { fill: '#ffffff', gradient: false, dash: 'dashed' },
    body: (c) => [ellipseEl(c, c.w / 2, c.h / 2, c.w / 2, c.h / 2)],
    textBox: (w, h) => ({ x: w * 0.1, y: 4, w: w * 0.8, h: h - 8 })
  }
]

