/** UML: class, sequence, use case, activity and state diagrams. */
import { n, type SvgNode } from '../svg'
import { fontOf, lineHeight, textLine, type Measure } from '../text'
import type { DiagramShape, ShapeStyle } from '../types'
import { ellipseEl, manyPorts, pathEl, polyEl, rectEl, sidePorts, stringList, strokeEl } from './kit'
import type { BodyContext, StencilDef } from './types'

// ---------------------------------------------------------------- class-like shapes

interface ClassLayout {
  stereotype: string
  name: string
  abstract: boolean
  rows: string[][]
  rowH: number
  headerH: number
  compartmentH: number[]
}

const PAD = 6

function classLayout(shape: DiagramShape, style: ShapeStyle, defaults: { stereotype?: string; compartments: ('attributes' | 'operations' | 'literals')[] }): ClassLayout {
  const data = shape.data ?? {}
  const stereotype = typeof data['stereotype'] === 'string' ? (data['stereotype'] as string) : (defaults.stereotype ?? '')
  const rows = defaults.compartments.map((key) => stringList(data[key]))
  const rowH = lineHeight(style.fontSize) + 2
  const headerH = PAD + (stereotype ? rowH - 2 : 0) + rowH + PAD / 2
  const compartmentH = rows.map((r) => (r.length ? r.length * rowH + PAD : 12))
  return { stereotype, name: shape.text, abstract: data['abstract'] === true, rows, rowH, headerH, compartmentH }
}

function classFit(shape: DiagramShape, style: ShapeStyle, measure: Measure, defaults: Parameters<typeof classLayout>[2]): { w: number; h: number } {
  const l = classLayout(shape, style, defaults)
  const font = fontOf(style)
  const widths = [measure(l.name, { ...font, bold: true }), l.stereotype ? measure(`«${l.stereotype}»`, font) : 0, ...l.rows.flat().map((r) => measure(r, font))]
  return { w: Math.ceil(Math.max(120, ...widths.map((w) => w + PAD * 2 + 4))), h: Math.ceil(l.headerH + l.compartmentH.reduce((a, b) => a + b, 0)) }
}

function classBody(c: BodyContext, defaults: Parameters<typeof classLayout>[2]): SvgNode[] {
  const l = classLayout(c.shape, c.style, defaults)
  const s = c.style
  const font = fontOf(s)
  const out: SvgNode[] = [rectEl(c, 0, 0, c.w, c.h, 0, { fill: '#ffffff' }), rectEl(c, 0, 0, c.w, l.headerH, 0)]
  let y = PAD
  if (l.stereotype) {
    out.push(textLine(`«${l.stereotype}»`, c.w / 2, y + s.fontSize * 0.85, { ...font, size: s.fontSize - 1 }, s.fontColor, 'middle'))
    y += l.rowH - 2
  }
  out.push(textLine(l.name, c.w / 2, y + s.fontSize * 0.9, { ...font, bold: true, italic: l.abstract || s.italic }, s.fontColor, 'middle'))
  y = l.headerH
  l.rows.forEach((rows, i) => {
    out.push(strokeEl(c, `M0 ${n(y)} L${n(c.w)} ${n(y)}`))
    let ry = y + PAD / 2
    for (const row of rows) {
      const isStatic = row.startsWith('_') && row.endsWith('_') && row.length > 2
      out.push(textLine(isStatic ? row.slice(1, -1) : row, PAD, ry + s.fontSize * 0.95, font, s.fontColor, 'start', isStatic ? { 'text-decoration': 'underline' } : {}))
      ry += l.rowH
    }
    y += l.compartmentH[i]
  })
  return out
}

const classDef = (id: string, name: string, keywords: string[], text: string, defaults: Parameters<typeof classLayout>[2], dataDoc: StencilDef['data']): StencilDef => ({
  id,
  name,
  category: 'uml-class',
  keywords,
  w: 160,
  h: 110,
  text,
  style: { fontSize: 11, gradient: true },
  body: (c) => classBody(c, defaults),
  textBox: () => null,
  ports: manyPorts,
  fit: (shape, style, measure) => classFit(shape, style, measure, defaults),
  data: dataDoc
})

const CLASS_DATA = {
  description:
    'stereotype (string, optional), abstract (boolean), attributes (string[] such as "- id: int" or "+ name: String"), operations (string[] such as "+ save(): void"). Wrap a member in underscores (_count: int_) to show it static (underlined). The text is the class name.',
  defaults: { attributes: ['- id: int'], operations: ['+ save(): void'] }
}

// ---------------------------------------------------------------- helpers

const yPort = (name: string): number | null => {
  const m = /^y=(-?\d+(?:\.\d+)?)$/.exec(name)
  return m ? Number(m[1]) : null
}

const LIFELINE_HEAD = 40

export const UML_STENCILS: StencilDef[] = [
  // ---- class
  classDef('uml.class', 'Class', ['class', 'object', 'type'], 'ClassName', { compartments: ['attributes', 'operations'] }, CLASS_DATA),
  classDef('uml.abstract-class', 'Abstract class', ['abstract', 'base class'], 'AbstractClass', { stereotype: 'abstract', compartments: ['attributes', 'operations'] }, {
    ...CLASS_DATA,
    defaults: { abstract: true, attributes: [], operations: ['+ run(): void'] }
  }),
  classDef('uml.interface', 'Interface', ['interface', 'protocol', 'contract'], 'IInterface', { stereotype: 'interface', compartments: ['attributes', 'operations'] }, {
    ...CLASS_DATA,
    defaults: { attributes: [], operations: ['+ execute(): void'] }
  }),
  classDef('uml.enumeration', 'Enumeration', ['enum', 'values'], 'Status', { stereotype: 'enumeration', compartments: ['literals'] }, {
    description: 'literals (string[]): the values. The text is the enumeration name.',
    defaults: { literals: ['ACTIVE', 'INACTIVE'] }
  }),
  {
    id: 'uml.package',
    name: 'Package',
    category: 'uml-class',
    keywords: ['namespace', 'module', 'folder'],
    w: 160,
    h: 110,
    text: 'package',
    container: true,
    style: { verticalAlign: 'top', bold: true },
    body: (c) => {
      const tw = Math.min(c.w * 0.45, 90)
      return [rectEl(c, 0, 0, tw, 18), rectEl(c, 0, 18, c.w, c.h - 18)]
    },
    textBox: (w) => ({ x: 6, y: 22, w: w - 12, h: 20 }),
    ports: manyPorts
  },
  {
    id: 'uml.note',
    name: 'Note',
    category: 'uml-class',
    keywords: ['comment', 'annotation'],
    w: 140,
    h: 70,
    text: 'Note',
    style: { fill: '#fffbd0', stroke: '#9a8a3a', gradient: false, fontSize: 11, textAlign: 'left', verticalAlign: 'top' },
    body: (c) => {
      const k = Math.min(14, c.w / 4, c.h / 4)
      return [polyEl(c, [[0, 0], [c.w - k, 0], [c.w, k], [c.w, c.h], [0, c.h]]), strokeEl(c, `M${n(c.w - k)} 0 L${n(c.w - k)} ${n(k)} L${n(c.w)} ${n(k)}`)]
    },
    textBox: (w, h) => ({ x: 8, y: 6, w: w - 22, h: h - 12 })
  },
  {
    id: 'uml.component',
    name: 'Component',
    category: 'uml-class',
    keywords: ['component', 'service', 'module'],
    w: 150,
    h: 70,
    text: 'Component',
    body: (c) => {
      const x = c.w - 26
      return [rectEl(c, 0, 0, c.w, c.h), rectEl(c, x, 8, 16, 18, 0, { fill: '#ffffff' }), rectEl(c, x - 4, 11, 8, 4, 0, { fill: '#ffffff' }), rectEl(c, x - 4, 19, 8, 4, 0, { fill: '#ffffff' })]
    },
    textBox: (w, h) => ({ x: 6, y: 6, w: w - 40, h: h - 12 })
  },
  {
    id: 'uml.object',
    name: 'Object',
    category: 'uml-class',
    keywords: ['instance'],
    w: 150,
    h: 70,
    text: 'obj : Class',
    style: { underline: true, verticalAlign: 'top' },
    body: (c) => {
      const slots = stringList(c.shape.data?.['slots'])
      const s = c.style
      const rowH = lineHeight(s.fontSize) + 2
      const top = rowH + PAD * 2
      const out: SvgNode[] = [rectEl(c, 0, 0, c.w, c.h)]
      if (slots.length) {
        out.push(strokeEl(c, `M0 ${n(top)} L${n(c.w)} ${n(top)}`))
        slots.forEach((slot, i) => out.push(textLine(slot, PAD, top + PAD / 2 + rowH * i + s.fontSize * 0.95, fontOf({ ...s, bold: false, italic: false }), s.fontColor)))
      }
      return out
    },
    textBox: (w) => ({ x: 6, y: PAD, w: w - 12, h: 18 }),
    fit: (shape, style, measure) => {
      const slots = stringList(shape.data?.['slots'])
      const rowH = lineHeight(style.fontSize) + 2
      const widths = [measure(shape.text, fontOf(style)), ...slots.map((s) => measure(s, fontOf(style)))]
      return { w: Math.ceil(Math.max(120, ...widths.map((w) => w + 20))), h: Math.ceil(rowH + PAD * 2 + (slots.length ? slots.length * rowH + PAD : 8)) }
    },
    data: { description: 'slots (string[] such as "name = \\"Ada\\""). The text is "objectName : ClassName".', defaults: { slots: [] } }
  },
  {
    id: 'uml.node',
    name: 'Node',
    category: 'uml-class',
    keywords: ['deployment', 'server', 'device', 'box'],
    w: 150,
    h: 90,
    text: 'Node',
    body: (c) => {
      const d = 12
      return [
        polyEl(c, [[0, d], [d, 0], [c.w, 0], [c.w, c.h - d], [c.w - d, c.h], [0, c.h]]),
        rectEl(c, 0, d, c.w - d, c.h - d),
        strokeEl(c, `M${n(c.w - d)} ${n(d)} L${n(c.w)} 0`)
      ]
    },
    textBox: (w, h) => ({ x: 6, y: 18, w: w - 24, h: h - 24 })
  },

  // ---- sequence
  {
    id: 'uml.lifeline',
    name: 'Lifeline',
    category: 'uml-sequence',
    keywords: ['participant', 'object', 'sequence'],
    w: 120,
    h: 360,
    text: 'Participant',
    body: (c) => {
      const hh = Math.min(LIFELINE_HEAD, c.h)
      return [rectEl(c, 0, 0, c.w, hh), strokeEl(c, `M${n(c.w / 2)} ${n(hh)} L${n(c.w / 2)} ${n(c.h)}`, { 'stroke-dasharray': '6 4' })]
    },
    textBox: (w, h) => ({ x: 4, y: 2, w: w - 8, h: Math.min(LIFELINE_HEAD, h) - 4 }),
    ports: (w, h) => [
      { id: 'n', x: w / 2, y: 0, dir: 'n' },
      { id: 'e', x: w, y: LIFELINE_HEAD / 2, dir: 'e' },
      { id: 'w', x: 0, y: LIFELINE_HEAD / 2, dir: 'w' },
      { id: 's', x: w / 2, y: h, dir: 's' }
    ],
    namedPorts: (shape, name) => {
      const y = yPort(name)
      if (y === null) return null
      const yy = Math.max(LIFELINE_HEAD, Math.min(shape.h, y))
      return [
        { id: name, x: shape.w / 2, y: yy, dir: 'e' },
        { id: name, x: shape.w / 2, y: yy, dir: 'w' }
      ]
    }
  },
  {
    id: 'uml.actor-lifeline',
    name: 'Actor lifeline',
    category: 'uml-sequence',
    keywords: ['actor', 'user', 'participant'],
    w: 80,
    h: 360,
    text: 'User',
    style: { gradient: false },
    body: (c) => {
      const cx = c.w / 2
      return [
        rectEl(c, 0, 0, c.w, 56, 0, { fill: 'transparent', stroke: 'none' }),
        ellipseEl(c, cx, 8, 7, 7),
        strokeEl(c, `M${n(cx)} 15 L${n(cx)} 30 M${n(cx - 12)} 20 L${n(cx + 12)} 20 M${n(cx)} 30 L${n(cx - 10)} 42 M${n(cx)} 30 L${n(cx + 10)} 42`),
        strokeEl(c, `M${n(cx)} 58 L${n(cx)} ${n(c.h)}`, { 'stroke-dasharray': '6 4' })
      ]
    },
    textBox: (w) => ({ x: -20, y: 42, w: w + 40, h: 16 }),
    ports: (w, h) => [
      { id: 'n', x: w / 2, y: 0, dir: 'n' },
      { id: 's', x: w / 2, y: h, dir: 's' }
    ],
    namedPorts: (shape, name) => {
      const y = yPort(name)
      if (y === null) return null
      const yy = Math.max(58, Math.min(shape.h, y))
      return [
        { id: name, x: shape.w / 2, y: yy, dir: 'e' },
        { id: name, x: shape.w / 2, y: yy, dir: 'w' }
      ]
    }
  },
  {
    id: 'uml.activation',
    name: 'Activation',
    category: 'uml-sequence',
    keywords: ['execution', 'focus of control'],
    w: 14,
    h: 80,
    style: { fill: '#ffffff', gradient: false },
    body: (c) => [rectEl(c, 0, 0, c.w, c.h)],
    textBox: () => null,
    namedPorts: (shape, name) => {
      const y = yPort(name)
      if (y === null) return null
      const yy = Math.max(0, Math.min(shape.h, y))
      return [
        { id: name, x: 0, y: yy, dir: 'w' },
        { id: name, x: shape.w, y: yy, dir: 'e' }
      ]
    }
  },
  {
    id: 'uml.fragment',
    name: 'Combined fragment',
    category: 'uml-sequence',
    keywords: ['alt', 'opt', 'loop', 'par', 'frame', 'fragment'],
    w: 300,
    h: 160,
    text: 'alt',
    container: true,
    style: { fill: 'none', gradient: false, fontSize: 11, bold: true, textAlign: 'left', verticalAlign: 'top' },
    body: (c) => {
      const s = c.style
      const guards = stringList(c.shape.data?.['guards'])
      const tagW = Math.max(40, c.measure(c.shape.text, fontOf(s)) + 22)
      const out: SvgNode[] = [rectEl(c, 0, 0, c.w, c.h, 0, { fill: 'transparent' }), pathEl(c, `M0 0 L${n(tagW)} 0 L${n(tagW)} 12 L${n(tagW - 8)} 20 L0 20 Z`, { fill: '#eef3fa' })]
      const parts = Math.max(1, guards.length)
      guards.forEach((g, i) => {
        const top = (c.h / parts) * i
        if (i > 0) out.push(strokeEl(c, `M0 ${n(top)} L${n(c.w)} ${n(top)}`, { 'stroke-dasharray': '6 4' }))
        out.push(textLine(g, i === 0 ? tagW + 8 : 8, top + (i === 0 ? 14 : 16), fontOf({ ...s, bold: false }), s.fontColor))
      })
      return out
    },
    textBox: () => ({ x: 6, y: 3, w: 100, h: 16 }),
    ports: manyPorts,
    data: { description: 'guards (string[]): one guard per operand such as "[ok]" and "[else]"; dashed lines split the frame. The text is the operator: alt, opt, loop, par, break, critical, ref.', defaults: { guards: ['[condition]', '[else]'] } }
  },
  {
    id: 'uml.destroy',
    name: 'Destruction',
    category: 'uml-sequence',
    keywords: ['destroy', 'delete', 'end', 'x'],
    w: 24,
    h: 24,
    keepAspect: true,
    style: { strokeWidth: 2.5, stroke: '#2a3a50' },
    body: (c) => [rectEl(c, 0, 0, c.w, c.h, 0, { fill: 'transparent', stroke: 'none' }), strokeEl(c, `M0 0 L${n(c.w)} ${n(c.h)} M${n(c.w)} 0 L0 ${n(c.h)}`)],
    textBox: () => null
  },

  // ---- use case
  {
    id: 'uml.actor',
    name: 'Actor',
    category: 'uml-usecase',
    keywords: ['user', 'person', 'role', 'stick figure'],
    w: 40,
    h: 72,
    text: 'Actor',
    style: { gradient: false, fill: '#ffffff' },
    body: (c) => {
      const cx = c.w / 2
      const r = Math.min(c.w, c.h) * 0.17
      return [
        rectEl(c, 0, 0, c.w, c.h, 0, { fill: 'transparent', stroke: 'none' }),
        ellipseEl(c, cx, r + 1, r, r),
        strokeEl(c, `M${n(cx)} ${n(r * 2 + 1)} L${n(cx)} ${n(c.h * 0.62)} M0 ${n(c.h * 0.4)} L${n(c.w)} ${n(c.h * 0.4)} M${n(cx)} ${n(c.h * 0.62)} L${n(c.w * 0.1)} ${n(c.h)} M${n(cx)} ${n(c.h * 0.62)} L${n(c.w * 0.9)} ${n(c.h)}`)
      ]
    },
    textBox: (w, h) => ({ x: -40, y: h + 2, w: w + 80, h: 18 }),
    ports: (w, h) => [
      { id: 'n', x: w / 2, y: 0, dir: 'n' },
      { id: 'e', x: w, y: h * 0.4, dir: 'e' },
      { id: 's', x: w / 2, y: h + 20, dir: 's' },
      { id: 'w', x: 0, y: h * 0.4, dir: 'w' }
    ]
  },
  {
    id: 'uml.usecase',
    name: 'Use case',
    category: 'uml-usecase',
    keywords: ['use case', 'goal', 'feature', 'ellipse'],
    w: 140,
    h: 60,
    text: 'Use case',
    body: (c) => [ellipseEl(c, c.w / 2, c.h / 2, c.w / 2, c.h / 2)],
    textBox: (w, h) => ({ x: w * 0.12, y: h * 0.14, w: w * 0.76, h: h * 0.72 }),
    ports: (w, h) => {
      const k = Math.SQRT1_2
      return [
        ...sidePorts(w, h),
        { id: 'ne', x: w / 2 + (w / 2) * k, y: h / 2 - (h / 2) * k, dir: 'e' },
        { id: 'se', x: w / 2 + (w / 2) * k, y: h / 2 + (h / 2) * k, dir: 'e' },
        { id: 'sw', x: w / 2 - (w / 2) * k, y: h / 2 + (h / 2) * k, dir: 'w' },
        { id: 'nw', x: w / 2 - (w / 2) * k, y: h / 2 - (h / 2) * k, dir: 'w' }
      ]
    }
  },
  {
    id: 'uml.system-boundary',
    name: 'System boundary',
    category: 'uml-usecase',
    keywords: ['system', 'subject', 'boundary', 'container'],
    w: 300,
    h: 340,
    text: 'System',
    container: true,
    style: { fill: '#ffffff', gradient: false, bold: true, verticalAlign: 'top' },
    body: (c) => [rectEl(c, 0, 0, c.w, c.h)],
    textBox: (w) => ({ x: 6, y: 6, w: w - 12, h: 20 }),
    ports: manyPorts
  },

  // ---- activity
  {
    id: 'uml.initial',
    name: 'Initial node',
    category: 'uml-activity',
    keywords: ['start', 'begin', 'initial'],
    w: 28,
    h: 28,
    keepAspect: true,
    style: { fill: '#1e2a3a', stroke: '#1e2a3a', gradient: false },
    body: (c) => [ellipseEl(c, c.w / 2, c.h / 2, c.w / 2, c.h / 2)],
    textBox: () => null
  },
  {
    id: 'uml.final',
    name: 'Final node',
    category: 'uml-activity',
    keywords: ['end', 'stop', 'final'],
    w: 30,
    h: 30,
    keepAspect: true,
    style: { fill: '#1e2a3a', stroke: '#1e2a3a', gradient: false },
    body: (c) => [ellipseEl(c, c.w / 2, c.h / 2, c.w / 2, c.h / 2, { fill: '#ffffff' }), ellipseEl(c, c.w / 2, c.h / 2, c.w / 2 - 5, c.h / 2 - 5, { stroke: 'none' })],
    textBox: () => null
  },
  {
    id: 'uml.flow-final',
    name: 'Flow final',
    category: 'uml-activity',
    keywords: ['end flow'],
    w: 28,
    h: 28,
    keepAspect: true,
    style: { fill: '#ffffff', gradient: false, stroke: '#1e2a3a' },
    body: (c) => {
      const k = (c.w / 2) * Math.SQRT1_2
      const cx = c.w / 2
      const cy = c.h / 2
      return [ellipseEl(c, cx, cy, c.w / 2, c.h / 2), strokeEl(c, `M${n(cx - k)} ${n(cy - k)} L${n(cx + k)} ${n(cy + k)} M${n(cx + k)} ${n(cy - k)} L${n(cx - k)} ${n(cy + k)}`)]
    },
    textBox: () => null
  },
  {
    id: 'uml.action',
    name: 'Action',
    category: 'uml-activity',
    keywords: ['activity', 'step', 'task'],
    w: 130,
    h: 50,
    text: 'Action',
    body: (c) => [rectEl(c, 0, 0, c.w, c.h, Math.min(14, c.h / 2.5))]
  },
  {
    id: 'uml.decision',
    name: 'Decision/merge',
    category: 'uml-activity',
    keywords: ['branch', 'merge', 'if'],
    w: 44,
    h: 44,
    body: (c) => [polyEl(c, [[c.w / 2, 0], [c.w, c.h / 2], [c.w / 2, c.h], [0, c.h / 2]])],
    textBox: (w) => ({ x: w + 4, y: -18, w: 120, h: 16 })
  },
  {
    id: 'uml.fork',
    name: 'Fork/join',
    category: 'uml-activity',
    keywords: ['join', 'parallel', 'bar', 'synchronization'],
    w: 140,
    h: 8,
    style: { fill: '#1e2a3a', stroke: '#1e2a3a', gradient: false },
    body: (c) => [rectEl(c, 0, 0, c.w, c.h, 1)],
    textBox: () => null,
    ports: (w, h) => [
      { id: 'n', x: w / 2, y: 0, dir: 'n' },
      { id: 's', x: w / 2, y: h, dir: 's' },
      { id: 'n1', x: w / 6, y: 0, dir: 'n' },
      { id: 'n3', x: (w * 5) / 6, y: 0, dir: 'n' },
      { id: 's1', x: w / 6, y: h, dir: 's' },
      { id: 's3', x: (w * 5) / 6, y: h, dir: 's' },
      { id: 'e', x: w, y: h / 2, dir: 'e' },
      { id: 'w', x: 0, y: h / 2, dir: 'w' }
    ]
  },
  {
    id: 'uml.object-node',
    name: 'Object node',
    category: 'uml-activity',
    keywords: ['object', 'data', 'pin'],
    w: 110,
    h: 46,
    text: 'Object',
    style: { fill: '#ffffff', gradient: false },
    body: (c) => [rectEl(c, 0, 0, c.w, c.h)]
  },
  {
    id: 'uml.send-signal',
    name: 'Send signal',
    category: 'uml-activity',
    keywords: ['signal', 'send', 'event'],
    w: 130,
    h: 50,
    text: 'Send signal',
    body: (c) => [polyEl(c, [[0, 0], [c.w - c.h * 0.4, 0], [c.w, c.h / 2], [c.w - c.h * 0.4, c.h], [0, c.h]])],
    textBox: (w, h) => ({ x: 6, y: 4, w: w - h * 0.4 - 8, h: h - 8 })
  },
  {
    id: 'uml.accept-event',
    name: 'Accept event',
    category: 'uml-activity',
    keywords: ['receive', 'event', 'signal'],
    w: 130,
    h: 50,
    text: 'Accept event',
    body: (c) => [polyEl(c, [[0, 0], [c.w, 0], [c.w, c.h], [0, c.h], [c.h * 0.4, c.h / 2]])],
    textBox: (w, h) => ({ x: h * 0.4 + 4, y: 4, w: w - h * 0.4 - 10, h: h - 8 })
  },
  {
    id: 'uml.time-event',
    name: 'Time event',
    category: 'uml-activity',
    keywords: ['timer', 'wait', 'hourglass'],
    w: 30,
    h: 40,
    style: { fill: '#ffffff', gradient: false },
    body: (c) => [polyEl(c, [[0, 0], [c.w, 0], [0, c.h], [c.w, c.h]])],
    textBox: (w, h) => ({ x: -45, y: h + 2, w: w + 90, h: 16 })
  },
  {
    id: 'uml.partition',
    name: 'Partition',
    category: 'uml-activity',
    keywords: ['swimlane', 'lane', 'partition', 'responsibility'],
    w: 220,
    h: 420,
    text: 'Partition',
    container: true,
    style: { fill: '#ffffff', gradient: false, bold: true, verticalAlign: 'middle' },
    body: (c) => [rectEl(c, 0, 0, c.w, c.h), rectEl(c, 0, 0, c.w, 28, 0, { fill: '#e6eef8' })],
    textBox: (w) => ({ x: 4, y: 2, w: w - 8, h: 24 }),
    ports: manyPorts
  },

  // ---- state
  {
    id: 'uml.state',
    name: 'State',
    category: 'uml-state',
    keywords: ['state', 'status', 'mode'],
    w: 140,
    h: 56,
    text: 'State',
    body: (c) => {
      const acts = stringList(c.shape.data?.['activities'])
      const s = c.style
      const rowH = lineHeight(s.fontSize) + 1
      const out: SvgNode[] = [rectEl(c, 0, 0, c.w, c.h, Math.min(14, c.h / 3))]
      if (acts.length) {
        const top = rowH + PAD * 1.5
        out.push(strokeEl(c, `M0 ${n(top)} L${n(c.w)} ${n(top)}`))
        acts.forEach((a, i) => out.push(textLine(a, PAD + 2, top + PAD / 2 + rowH * i + s.fontSize * 0.95, fontOf({ ...s, bold: false, italic: false }), s.fontColor)))
      }
      return out
    },
    textBox: (w, h, shape) => (stringList(shape.data?.['activities']).length ? { x: 6, y: 3, w: w - 12, h: 20 } : { x: 6, y: 4, w: w - 12, h: h - 8 }),
    fit: (shape, style, measure) => {
      const acts = stringList(shape.data?.['activities'])
      if (!acts.length) return { w: 80, h: 36 }
      const rowH = lineHeight(style.fontSize) + 1
      const widths = [measure(shape.text, fontOf(style)), ...acts.map((a) => measure(a, fontOf(style)))]
      return { w: Math.ceil(Math.max(120, ...widths.map((w) => w + 20))), h: Math.ceil(rowH + PAD * 2.5 + acts.length * rowH) }
    },
    data: { description: 'activities (string[], optional) such as "entry / start timer", "do / poll", "exit / stop"; shown under a line.', defaults: {} }
  },
  {
    id: 'uml.composite-state',
    name: 'Composite state',
    category: 'uml-state',
    keywords: ['superstate', 'region', 'nested'],
    w: 300,
    h: 200,
    text: 'Composite state',
    container: true,
    style: { fill: '#f6f9fd', gradient: false, bold: true, verticalAlign: 'top', textAlign: 'left' },
    body: (c) => [rectEl(c, 0, 0, c.w, c.h, 16), strokeEl(c, `M0 26 L${n(c.w)} 26`)],
    textBox: (w) => ({ x: 12, y: 4, w: w - 24, h: 20 }),
    ports: manyPorts
  },
  {
    id: 'uml.choice',
    name: 'Choice',
    category: 'uml-state',
    keywords: ['branch', 'decision'],
    w: 36,
    h: 36,
    body: (c) => [polyEl(c, [[c.w / 2, 0], [c.w, c.h / 2], [c.w / 2, c.h], [0, c.h / 2]])],
    textBox: (w) => ({ x: w + 4, y: -18, w: 120, h: 16 })
  },
  {
    id: 'uml.history',
    name: 'History',
    category: 'uml-state',
    keywords: ['history', 'shallow history'],
    w: 30,
    h: 30,
    keepAspect: true,
    text: 'H',
    style: { fill: '#ffffff', gradient: false, bold: true },
    body: (c) => [ellipseEl(c, c.w / 2, c.h / 2, c.w / 2, c.h / 2)],
    textBox: (w, h) => ({ x: 0, y: 0, w, h })
  },
  {
    id: 'uml.junction',
    name: 'Junction',
    category: 'uml-state',
    keywords: ['junction', 'dot'],
    w: 16,
    h: 16,
    keepAspect: true,
    style: { fill: '#1e2a3a', stroke: '#1e2a3a', gradient: false },
    body: (c) => [ellipseEl(c, c.w / 2, c.h / 2, c.w / 2, c.h / 2)],
    textBox: () => null
  }
]
