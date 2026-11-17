/** Basic Shapes: the everyday geometric shapes. */
import { n } from '../svg'
import { ellipseEl, pathEl, polyEl, rectEl, regularPolygon, star, strokeEl, textInset } from './kit'
import type { StencilDef } from './types'

const B = 'basic' as const

export const BASIC_STENCILS: StencilDef[] = [
  { id: 'basic.rectangle', name: 'Rectangle', category: B, keywords: ['box', 'square'], w: 120, h: 70, body: (c) => [rectEl(c, 0, 0, c.w, c.h)] },
  {
    id: 'basic.rounded-rectangle',
    name: 'Rounded rectangle',
    category: B,
    keywords: ['box', 'round'],
    w: 120,
    h: 70,
    body: (c) => [rectEl(c, 0, 0, c.w, c.h, Math.min(12, c.h / 4, c.w / 4))]
  },
  { id: 'basic.square', name: 'Square', category: B, w: 80, h: 80, keepAspect: true, body: (c) => [rectEl(c, 0, 0, c.w, c.h)] },
  { id: 'basic.ellipse', name: 'Ellipse', category: B, keywords: ['oval'], w: 120, h: 80, body: (c) => [ellipseEl(c, c.w / 2, c.h / 2, c.w / 2, c.h / 2)] },
  { id: 'basic.circle', name: 'Circle', category: B, w: 80, h: 80, keepAspect: true, body: (c) => [ellipseEl(c, c.w / 2, c.h / 2, c.w / 2, c.h / 2)] },
  {
    id: 'basic.triangle',
    name: 'Triangle',
    category: B,
    w: 100,
    h: 86,
    body: (c) => [polyEl(c, [[c.w / 2, 0], [c.w, c.h], [0, c.h]])],
    textBox: (w, h) => ({ x: w * 0.25, y: h * 0.4, w: w * 0.5, h: h * 0.55 }),
    ports: (w, h) => [
      { id: 'n', x: w / 2, y: 0, dir: 'n' },
      { id: 'e', x: w * 0.75, y: h / 2, dir: 'e' },
      { id: 's', x: w / 2, y: h, dir: 's' },
      { id: 'w', x: w * 0.25, y: h / 2, dir: 'w' }
    ]
  },
  {
    id: 'basic.right-triangle',
    name: 'Right triangle',
    category: B,
    w: 100,
    h: 80,
    body: (c) => [polyEl(c, [[0, 0], [c.w, c.h], [0, c.h]])],
    textBox: (w, h) => ({ x: 4, y: h * 0.45, w: w * 0.5, h: h * 0.5 }),
    ports: (w, h) => [
      { id: 'n', x: 0, y: 0, dir: 'n' },
      { id: 'e', x: w / 2, y: h / 2, dir: 'e' },
      { id: 's', x: w / 2, y: h, dir: 's' },
      { id: 'w', x: 0, y: h / 2, dir: 'w' }
    ]
  },
  {
    id: 'basic.diamond',
    name: 'Diamond',
    category: B,
    keywords: ['rhombus'],
    w: 100,
    h: 80,
    body: (c) => [polyEl(c, [[c.w / 2, 0], [c.w, c.h / 2], [c.w / 2, c.h], [0, c.h / 2]])],
    textBox: (w, h) => ({ x: w * 0.2, y: h * 0.2, w: w * 0.6, h: h * 0.6 })
  },
  { id: 'basic.pentagon', name: 'Pentagon', category: B, w: 90, h: 86, body: (c) => [polyEl(c, regularPolygon(c.w, c.h, 5))], textBox: (w, h) => ({ x: w * 0.18, y: h * 0.25, w: w * 0.64, h: h * 0.6 }) },
  {
    id: 'basic.hexagon',
    name: 'Hexagon',
    category: B,
    w: 110,
    h: 80,
    body: (c) => [polyEl(c, [[c.w * 0.25, 0], [c.w * 0.75, 0], [c.w, c.h / 2], [c.w * 0.75, c.h], [c.w * 0.25, c.h], [0, c.h / 2]])],
    textBox: (w, h) => ({ x: w * 0.2, y: 4, w: w * 0.6, h: h - 8 })
  },
  {
    id: 'basic.octagon',
    name: 'Octagon',
    category: B,
    keywords: ['stop'],
    w: 90,
    h: 90,
    body: (c) => {
      const k = Math.min(c.w, c.h) * 0.29
      return [polyEl(c, [[k, 0], [c.w - k, 0], [c.w, k], [c.w, c.h - k], [c.w - k, c.h], [k, c.h], [0, c.h - k], [0, k]])]
    }
  },
  { id: 'basic.star', name: 'Star', category: B, w: 90, h: 86, keepAspect: true, body: (c) => [polyEl(c, star(c.w, c.h))], textBox: (w, h) => ({ x: w * 0.3, y: h * 0.35, w: w * 0.4, h: h * 0.35 }) },
  {
    id: 'basic.parallelogram',
    name: 'Parallelogram',
    category: B,
    w: 130,
    h: 70,
    body: (c) => {
      const k = Math.min(c.w * 0.2, c.h * 0.6)
      return [polyEl(c, [[k, 0], [c.w, 0], [c.w - k, c.h], [0, c.h]])]
    },
    textBox: (w, h) => ({ x: w * 0.18, y: 4, w: w * 0.64, h: h - 8 })
  },
  {
    id: 'basic.trapezoid',
    name: 'Trapezoid',
    category: B,
    w: 120,
    h: 70,
    body: (c) => {
      const k = c.w * 0.2
      return [polyEl(c, [[k, 0], [c.w - k, 0], [c.w, c.h], [0, c.h]])]
    },
    textBox: (w, h) => ({ x: w * 0.18, y: 4, w: w * 0.64, h: h - 8 })
  },
  {
    id: 'basic.cross',
    name: 'Cross',
    category: B,
    keywords: ['plus'],
    w: 80,
    h: 80,
    body: (c) => {
      const a = c.w / 3
      const b = c.h / 3
      return [polyEl(c, [[a, 0], [2 * a, 0], [2 * a, b], [c.w, b], [c.w, 2 * b], [2 * a, 2 * b], [2 * a, c.h], [a, c.h], [a, 2 * b], [0, 2 * b], [0, b], [a, b]])]
    }
  },
  {
    id: 'basic.arrow-right',
    name: 'Block arrow',
    category: B,
    keywords: ['arrow', 'right'],
    w: 130,
    h: 70,
    body: (c) => {
      const head = Math.min(c.w * 0.4, c.h)
      return [polyEl(c, [[0, c.h * 0.28], [c.w - head, c.h * 0.28], [c.w - head, 0], [c.w, c.h / 2], [c.w - head, c.h], [c.w - head, c.h * 0.72], [0, c.h * 0.72]])]
    },
    textBox: (w, h) => ({ x: 4, y: h * 0.28, w: w * 0.7, h: h * 0.44 })
  },
  {
    id: 'basic.arrow-left',
    name: 'Left arrow',
    category: B,
    keywords: ['arrow'],
    w: 130,
    h: 70,
    body: (c) => {
      const head = Math.min(c.w * 0.4, c.h)
      return [polyEl(c, [[c.w, c.h * 0.28], [head, c.h * 0.28], [head, 0], [0, c.h / 2], [head, c.h], [head, c.h * 0.72], [c.w, c.h * 0.72]])]
    },
    textBox: (w, h) => ({ x: w * 0.28, y: h * 0.28, w: w * 0.7, h: h * 0.44 })
  },
  {
    id: 'basic.arrow-double',
    name: 'Double arrow',
    category: B,
    keywords: ['arrow', 'both'],
    w: 140,
    h: 70,
    body: (c) => {
      const head = Math.min(c.w * 0.3, c.h)
      return [polyEl(c, [[0, c.h / 2], [head, 0], [head, c.h * 0.28], [c.w - head, c.h * 0.28], [c.w - head, 0], [c.w, c.h / 2], [c.w - head, c.h], [c.w - head, c.h * 0.72], [head, c.h * 0.72], [head, c.h]])]
    },
    textBox: (w, h) => ({ x: w * 0.2, y: h * 0.28, w: w * 0.6, h: h * 0.44 })
  },
  {
    id: 'basic.arrow-up',
    name: 'Up arrow',
    category: B,
    keywords: ['arrow'],
    w: 70,
    h: 120,
    body: (c) => {
      const head = Math.min(c.h * 0.4, c.w)
      return [polyEl(c, [[c.w * 0.28, c.h], [c.w * 0.28, head], [0, head], [c.w / 2, 0], [c.w, head], [c.w * 0.72, head], [c.w * 0.72, c.h]])]
    },
    textBox: (w, h) => ({ x: w * 0.28, y: h * 0.35, w: w * 0.44, h: h * 0.6 })
  },
  {
    id: 'basic.chevron',
    name: 'Chevron',
    category: B,
    keywords: ['step', 'process arrow'],
    w: 130,
    h: 60,
    body: (c) => {
      const k = Math.min(c.h / 2, c.w * 0.3)
      return [polyEl(c, [[0, 0], [c.w - k, 0], [c.w, c.h / 2], [c.w - k, c.h], [0, c.h], [k, c.h / 2]])]
    },
    textBox: (w, h) => ({ x: h / 2, y: 4, w: Math.max(10, w - h), h: h - 8 })
  },
  {
    id: 'basic.cylinder',
    name: 'Cylinder',
    category: B,
    keywords: ['can', 'drum'],
    w: 90,
    h: 100,
    body: (c) => {
      const ry = Math.min(c.h * 0.12, 14)
      const d = `M0 ${n(ry)} A${n(c.w / 2)} ${n(ry)} 0 0 1 ${n(c.w)} ${n(ry)} L${n(c.w)} ${n(c.h - ry)} A${n(c.w / 2)} ${n(ry)} 0 0 1 0 ${n(c.h - ry)} Z`
      return [pathEl(c, d), strokeEl(c, `M0 ${n(ry)} A${n(c.w / 2)} ${n(ry)} 0 0 0 ${n(c.w)} ${n(ry)}`)]
    },
    textBox: (w, h) => ({ x: 6, y: Math.min(h * 0.24, 28), w: w - 12, h: h - Math.min(h * 0.36, 40) })
  },
  {
    id: 'basic.cloud',
    name: 'Cloud',
    category: B,
    w: 140,
    h: 90,
    body: (c) => {
      const s = (x: number, y: number): string => `${n(x * c.w)} ${n(y * c.h)}`
      const d =
        `M${s(0.25, 0.92)} C${s(0.06, 0.92)} ${s(0, 0.66)} ${s(0.13, 0.58)} C${s(0.04, 0.4)} ${s(0.2, 0.22)} ${s(0.34, 0.3)} ` +
        `C${s(0.38, 0.06)} ${s(0.64, 0.04)} ${s(0.68, 0.24)} C${s(0.8, 0.12)} ${s(0.98, 0.26)} ${s(0.9, 0.46)} ` +
        `C${s(1.02, 0.56)} ${s(0.98, 0.9)} ${s(0.78, 0.9)} C${s(0.7, 1.02)} ${s(0.45, 1.02)} ${s(0.4, 0.92)} Z`
      return [pathEl(c, d)]
    },
    textBox: (w, h) => ({ x: w * 0.18, y: h * 0.3, w: w * 0.64, h: h * 0.5 })
  },
  {
    id: 'basic.callout',
    name: 'Callout',
    category: B,
    keywords: ['speech', 'bubble', 'comment'],
    w: 140,
    h: 90,
    body: (c) => {
      const bh = c.h * 0.75
      return [polyEl(c, [[0, 0], [c.w, 0], [c.w, bh], [c.w * 0.42, bh], [c.w * 0.18, c.h], [c.w * 0.25, bh], [0, bh]])]
    },
    textBox: (w, h) => ({ x: 6, y: 4, w: w - 12, h: h * 0.75 - 8 })
  },
  {
    id: 'basic.note',
    name: 'Note',
    category: B,
    keywords: ['sticky', 'comment', 'memo'],
    w: 120,
    h: 80,
    style: { fill: '#fff8c4', stroke: '#b59a3a' },
    body: (c) => {
      const k = Math.min(16, c.w / 4, c.h / 4)
      return [polyEl(c, [[0, 0], [c.w - k, 0], [c.w, k], [c.w, c.h], [0, c.h]]), strokeEl(c, `M${n(c.w - k)} 0 L${n(c.w - k)} ${n(k)} L${n(c.w)} ${n(k)}`)]
    },
    textBox: (w, h) => textInset(w, h, 8)
  },
  {
    id: 'basic.text',
    name: 'Text',
    category: B,
    keywords: ['label', 'title', 'caption'],
    w: 140,
    h: 30,
    text: 'Text',
    style: { fill: 'none', stroke: 'none', gradient: false },
    body: (c) => [rectEl(c, 0, 0, c.w, c.h, 0, { fill: 'transparent', stroke: 'none' })],
    textBox: (w, h) => ({ x: 2, y: 2, w: w - 4, h: h - 4 })
  },
  {
    id: 'basic.frame',
    name: 'Frame',
    category: B,
    keywords: ['border', 'group'],
    w: 220,
    h: 150,
    container: true,
    style: { fill: 'none', gradient: false, dash: 'dashed', verticalAlign: 'top', textAlign: 'left', stroke: '#6a7f9c' },
    body: (c) => [rectEl(c, 0, 0, c.w, c.h, 6, { fill: 'transparent' })],
    textBox: (w) => ({ x: 8, y: 4, w: w - 16, h: 20 })
  },
  {
    id: 'basic.line',
    name: 'Line',
    category: B,
    keywords: ['divider', 'rule', 'separator'],
    w: 160,
    h: 10,
    style: { fill: 'none', gradient: false },
    body: (c) => [rectEl(c, 0, 0, c.w, c.h, 0, { fill: 'transparent', stroke: 'none' }), strokeEl(c, `M0 ${n(c.h / 2)} L${n(c.w)} ${n(c.h / 2)}`)],
    textBox: (w) => ({ x: 0, y: -18, w, h: 16 }),
    ports: (w, h) => [
      { id: 'w', x: 0, y: h / 2, dir: 'w' },
      { id: 'e', x: w, y: h / 2, dir: 'e' },
      { id: 'n', x: w / 2, y: h / 2, dir: 'n' },
      { id: 's', x: w / 2, y: h / 2, dir: 's' }
    ]
  }
]

