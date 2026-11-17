/** Flowchart: the ANSI/ISO 5807 process symbols. */
import { n } from '../svg'
import { ellipseEl, pathEl, polyEl, rectEl, strokeEl, wave } from './kit'
import type { StencilDef } from './types'

const F = 'flowchart' as const

export const FLOWCHART_STENCILS: StencilDef[] = [
  { id: 'flowchart.process', name: 'Process', category: F, keywords: ['step', 'action', 'task'], w: 120, h: 60, text: 'Process', body: (c) => [rectEl(c, 0, 0, c.w, c.h)] },
  {
    id: 'flowchart.decision',
    name: 'Decision',
    category: F,
    keywords: ['if', 'condition', 'branch', 'question'],
    w: 120,
    h: 80,
    text: 'Decision?',
    body: (c) => [polyEl(c, [[c.w / 2, 0], [c.w, c.h / 2], [c.w / 2, c.h], [0, c.h / 2]])],
    textBox: (w, h) => ({ x: w * 0.18, y: h * 0.2, w: w * 0.64, h: h * 0.6 })
  },
  {
    id: 'flowchart.terminator',
    name: 'Start/End',
    category: F,
    keywords: ['terminator', 'start', 'end', 'stop', 'begin'],
    w: 120,
    h: 50,
    text: 'Start',
    body: (c) => [rectEl(c, 0, 0, c.w, c.h, Math.min(c.h / 2, c.w / 2))],
    textBox: (w, h) => ({ x: h / 3, y: 4, w: Math.max(10, w - (h * 2) / 3), h: h - 8 })
  },
  {
    id: 'flowchart.data',
    name: 'Data',
    category: F,
    keywords: ['input', 'output', 'io', 'parallelogram'],
    w: 130,
    h: 60,
    text: 'Data',
    body: (c) => {
      const k = Math.min(c.w * 0.18, c.h * 0.5)
      return [polyEl(c, [[k, 0], [c.w, 0], [c.w - k, c.h], [0, c.h]])]
    },
    textBox: (w, h) => ({ x: w * 0.16, y: 4, w: w * 0.68, h: h - 8 }),
    ports: (w, h) => [
      { id: 'n', x: w / 2, y: 0, dir: 'n' },
      { id: 'e', x: w - Math.min(w * 0.18, h * 0.5) / 2, y: h / 2, dir: 'e' },
      { id: 's', x: w / 2, y: h, dir: 's' },
      { id: 'w', x: Math.min(w * 0.18, h * 0.5) / 2, y: h / 2, dir: 'w' }
    ]
  },
  {
    id: 'flowchart.document',
    name: 'Document',
    category: F,
    keywords: ['report', 'paper'],
    w: 120,
    h: 70,
    text: 'Document',
    body: (c) => {
      const a = c.h * 0.08
      return [pathEl(c, `M0 0 L${n(c.w)} 0 L${n(c.w)} ${n(c.h - a)} ${wave(0, c.w, c.h - a, a)} Z`)]
    },
    textBox: (w, h) => ({ x: 6, y: 4, w: w - 12, h: h * 0.8 - 6 }),
    ports: (w, h) => [
      { id: 'n', x: w / 2, y: 0, dir: 'n' },
      { id: 'e', x: w, y: h * 0.45, dir: 'e' },
      { id: 's', x: w / 2, y: h - h * 0.08, dir: 's' },
      { id: 'w', x: 0, y: h * 0.45, dir: 'w' }
    ]
  },
  {
    id: 'flowchart.multi-document',
    name: 'Multiple documents',
    category: F,
    keywords: ['documents', 'reports'],
    w: 130,
    h: 80,
    text: 'Documents',
    body: (c) => {
      const o = 7
      const a = c.h * 0.07
      const page = (dx: number, dy: number, w: number, h: number) => pathEl(c, `M${n(dx)} ${n(dy)} L${n(dx + w)} ${n(dy)} L${n(dx + w)} ${n(dy + h - a)} ${wave(dx, dx + w, dy + h - a, a)} Z`)
      const w = c.w - o * 2
      const h = c.h - o * 2
      return [page(o * 2, 0, w, h), page(o, o, w, h), page(0, o * 2, w, h)]
    },
    textBox: (w, h) => ({ x: 6, y: 18, w: w - 26, h: h - 34 })
  },
  {
    id: 'flowchart.predefined-process',
    name: 'Predefined process',
    category: F,
    keywords: ['subroutine', 'function', 'call', 'subprocess'],
    w: 130,
    h: 60,
    text: 'Subprocess',
    body: (c) => {
      const k = Math.min(12, c.w * 0.1)
      return [rectEl(c, 0, 0, c.w, c.h), strokeEl(c, `M${n(k)} 0 L${n(k)} ${n(c.h)} M${n(c.w - k)} 0 L${n(c.w - k)} ${n(c.h)}`)]
    },
    textBox: (w, h) => ({ x: 16, y: 4, w: w - 32, h: h - 8 })
  },
  {
    id: 'flowchart.manual-input',
    name: 'Manual input',
    category: F,
    keywords: ['keyboard', 'form', 'user input'],
    w: 120,
    h: 60,
    text: 'Manual input',
    body: (c) => [polyEl(c, [[0, c.h * 0.3], [c.w, 0], [c.w, c.h], [0, c.h]])],
    textBox: (w, h) => ({ x: 6, y: h * 0.25, w: w - 12, h: h * 0.72 })
  },
  {
    id: 'flowchart.manual-operation',
    name: 'Manual operation',
    category: F,
    keywords: ['manual', 'offline'],
    w: 130,
    h: 60,
    text: 'Manual operation',
    body: (c) => {
      const k = c.w * 0.16
      return [polyEl(c, [[0, 0], [c.w, 0], [c.w - k, c.h], [k, c.h]])]
    },
    textBox: (w, h) => ({ x: w * 0.16, y: 4, w: w * 0.68, h: h - 8 })
  },
  {
    id: 'flowchart.preparation',
    name: 'Preparation',
    category: F,
    keywords: ['setup', 'initialize', 'loop', 'hexagon'],
    w: 130,
    h: 60,
    text: 'Preparation',
    body: (c) => {
      const k = Math.min(c.w * 0.18, c.h * 0.5)
      return [polyEl(c, [[k, 0], [c.w - k, 0], [c.w, c.h / 2], [c.w - k, c.h], [k, c.h], [0, c.h / 2]])]
    },
    textBox: (w, h) => ({ x: w * 0.16, y: 4, w: w * 0.68, h: h - 8 })
  },
  {
    id: 'flowchart.delay',
    name: 'Delay',
    category: F,
    keywords: ['wait', 'pause'],
    w: 110,
    h: 60,
    text: 'Delay',
    body: (c) => {
      const r = Math.min(c.h / 2, c.w / 2)
      return [pathEl(c, `M0 0 L${n(c.w - r)} 0 A${n(r)} ${n(c.h / 2)} 0 0 1 ${n(c.w - r)} ${n(c.h)} L0 ${n(c.h)} Z`)]
    },
    textBox: (w, h) => ({ x: 6, y: 4, w: w - h / 2 - 6, h: h - 8 })
  },
  {
    id: 'flowchart.display',
    name: 'Display',
    category: F,
    keywords: ['screen', 'monitor', 'show'],
    w: 130,
    h: 60,
    text: 'Display',
    body: (c) => {
      const k = c.w * 0.16
      const r = c.w * 0.12
      return [pathEl(c, `M0 ${n(c.h / 2)} L${n(k)} 0 L${n(c.w - r)} 0 A${n(r)} ${n(c.h / 2)} 0 0 1 ${n(c.w - r)} ${n(c.h)} L${n(k)} ${n(c.h)} Z`)]
    },
    textBox: (w, h) => ({ x: w * 0.16, y: 4, w: w * 0.68, h: h - 8 })
  },
  {
    id: 'flowchart.stored-data',
    name: 'Stored data',
    category: F,
    keywords: ['storage', 'data store'],
    w: 130,
    h: 60,
    text: 'Stored data',
    body: (c) => {
      const r = c.w * 0.1
      return [pathEl(c, `M${n(r)} 0 L${n(c.w)} 0 A${n(r)} ${n(c.h / 2)} 0 0 0 ${n(c.w)} ${n(c.h)} L${n(r)} ${n(c.h)} A${n(r)} ${n(c.h / 2)} 0 0 1 ${n(r)} 0 Z`)]
    },
    textBox: (w, h) => ({ x: w * 0.12, y: 4, w: w * 0.72, h: h - 8 })
  },
  {
    id: 'flowchart.database',
    name: 'Database',
    category: F,
    keywords: ['db', 'disk', 'cylinder', 'direct access', 'sql'],
    w: 90,
    h: 90,
    text: 'Database',
    body: (c) => {
      const ry = Math.min(c.h * 0.12, 14)
      const d = `M0 ${n(ry)} A${n(c.w / 2)} ${n(ry)} 0 0 1 ${n(c.w)} ${n(ry)} L${n(c.w)} ${n(c.h - ry)} A${n(c.w / 2)} ${n(ry)} 0 0 1 0 ${n(c.h - ry)} Z`
      return [pathEl(c, d), strokeEl(c, `M0 ${n(ry)} A${n(c.w / 2)} ${n(ry)} 0 0 0 ${n(c.w)} ${n(ry)}`)]
    },
    textBox: (w, h) => ({ x: 6, y: Math.min(h * 0.24, 28), w: w - 12, h: h - Math.min(h * 0.36, 40) })
  },
  {
    id: 'flowchart.internal-storage',
    name: 'Internal storage',
    category: F,
    keywords: ['memory', 'ram'],
    w: 100,
    h: 70,
    text: 'Memory',
    body: (c) => [rectEl(c, 0, 0, c.w, c.h), strokeEl(c, `M12 0 L12 ${n(c.h)} M0 12 L${n(c.w)} 12`)],
    textBox: (w, h) => ({ x: 16, y: 16, w: w - 20, h: h - 20 })
  },
  {
    id: 'flowchart.off-page',
    name: 'Off-page reference',
    category: F,
    keywords: ['continue', 'page', 'link'],
    w: 70,
    h: 70,
    text: 'A',
    body: (c) => [polyEl(c, [[0, 0], [c.w, 0], [c.w, c.h * 0.6], [c.w / 2, c.h], [0, c.h * 0.6]])],
    textBox: (w, h) => ({ x: 4, y: 4, w: w - 8, h: h * 0.6 })
  },
  {
    id: 'flowchart.connector',
    name: 'On-page reference',
    category: F,
    keywords: ['connector', 'circle', 'junction', 'jump'],
    w: 50,
    h: 50,
    text: '1',
    keepAspect: true,
    body: (c) => [ellipseEl(c, c.w / 2, c.h / 2, c.w / 2, c.h / 2)]
  },
  {
    id: 'flowchart.merge',
    name: 'Merge',
    category: F,
    keywords: ['triangle', 'combine'],
    w: 70,
    h: 60,
    body: (c) => [polyEl(c, [[0, 0], [c.w, 0], [c.w / 2, c.h]])],
    textBox: (w, h) => ({ x: w * 0.2, y: 2, w: w * 0.6, h: h * 0.5 }),
    ports: (w, h) => [
      { id: 'n', x: w / 2, y: 0, dir: 'n' },
      { id: 'e', x: w * 0.75, y: h / 2, dir: 'e' },
      { id: 's', x: w / 2, y: h, dir: 's' },
      { id: 'w', x: w * 0.25, y: h / 2, dir: 'w' }
    ]
  },
  {
    id: 'flowchart.extract',
    name: 'Extract',
    category: F,
    keywords: ['triangle', 'split'],
    w: 70,
    h: 60,
    body: (c) => [polyEl(c, [[c.w / 2, 0], [c.w, c.h], [0, c.h]])],
    textBox: (w, h) => ({ x: w * 0.2, y: h * 0.45, w: w * 0.6, h: h * 0.5 }),
    ports: (w, h) => [
      { id: 'n', x: w / 2, y: 0, dir: 'n' },
      { id: 'e', x: w * 0.75, y: h / 2, dir: 'e' },
      { id: 's', x: w / 2, y: h, dir: 's' },
      { id: 'w', x: w * 0.25, y: h / 2, dir: 'w' }
    ]
  },
  {
    id: 'flowchart.collate',
    name: 'Collate',
    category: F,
    keywords: ['hourglass'],
    w: 60,
    h: 70,
    body: (c) => [polyEl(c, [[0, 0], [c.w, 0], [0, c.h], [c.w, c.h]])],
    textBox: () => null
  },
  {
    id: 'flowchart.sort',
    name: 'Sort',
    category: F,
    keywords: ['order'],
    w: 70,
    h: 70,
    body: (c) => [polyEl(c, [[c.w / 2, 0], [c.w, c.h / 2], [c.w / 2, c.h], [0, c.h / 2]]), strokeEl(c, `M0 ${n(c.h / 2)} L${n(c.w)} ${n(c.h / 2)}`)],
    textBox: () => null
  },
  {
    id: 'flowchart.summing-junction',
    name: 'Summing junction',
    category: F,
    keywords: ['and', 'sum'],
    w: 50,
    h: 50,
    keepAspect: true,
    body: (c) => {
      const r = c.w / 2
      const k = r * Math.SQRT1_2
      return [ellipseEl(c, r, c.h / 2, r, c.h / 2), strokeEl(c, `M${n(r - k)} ${n(c.h / 2 - k)} L${n(r + k)} ${n(c.h / 2 + k)} M${n(r + k)} ${n(c.h / 2 - k)} L${n(r - k)} ${n(c.h / 2 + k)}`)]
    },
    textBox: () => null
  },
  {
    id: 'flowchart.or',
    name: 'Or',
    category: F,
    keywords: ['or', 'plus'],
    w: 50,
    h: 50,
    keepAspect: true,
    body: (c) => [ellipseEl(c, c.w / 2, c.h / 2, c.w / 2, c.h / 2), strokeEl(c, `M${n(c.w / 2)} 0 L${n(c.w / 2)} ${n(c.h)} M0 ${n(c.h / 2)} L${n(c.w)} ${n(c.h / 2)}`)],
    textBox: () => null
  },
  {
    id: 'flowchart.card',
    name: 'Card',
    category: F,
    keywords: ['punched card'],
    w: 110,
    h: 60,
    text: 'Card',
    body: (c) => {
      const k = Math.min(c.h * 0.35, c.w * 0.25)
      return [polyEl(c, [[k, 0], [c.w, 0], [c.w, c.h], [0, c.h], [0, k]])]
    }
  },
  {
    id: 'flowchart.punched-tape',
    name: 'Punched tape',
    category: F,
    keywords: ['tape'],
    w: 120,
    h: 60,
    text: 'Tape',
    body: (c) => {
      const a = c.h * 0.1
      return [pathEl(c, `M0 ${n(a)} C${n(c.w * 0.25)} ${n(a * 3)} ${n(c.w * 0.75)} ${n(-a)} ${n(c.w)} ${n(a)} L${n(c.w)} ${n(c.h - a)} C${n(c.w * 0.75)} ${n(c.h - a * 3)} ${n(c.w * 0.25)} ${n(c.h + a)} 0 ${n(c.h - a)} Z`)]
    }
  },
  {
    id: 'flowchart.loop-limit',
    name: 'Loop limit',
    category: F,
    keywords: ['loop', 'repeat', 'while', 'for'],
    w: 120,
    h: 60,
    text: 'Loop',
    body: (c) => {
      const k = Math.min(c.h * 0.3, c.w * 0.2)
      return [polyEl(c, [[k, 0], [c.w - k, 0], [c.w, k], [c.w, c.h], [0, c.h], [0, k]])]
    }
  },
  {
    id: 'flowchart.annotation',
    name: 'Annotation',
    category: F,
    keywords: ['comment', 'note', 'bracket'],
    w: 130,
    h: 60,
    text: 'Comment',
    style: { fill: 'none', gradient: false, textAlign: 'left' },
    body: (c) => [rectEl(c, 0, 0, c.w, c.h, 0, { fill: 'transparent', stroke: 'none' }), strokeEl(c, `M18 0 L0 0 L0 ${n(c.h)} L18 ${n(c.h)}`)],
    textBox: (w, h) => ({ x: 8, y: 2, w: w - 10, h: h - 4 })
  }
]
