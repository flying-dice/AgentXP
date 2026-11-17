/** Containers and swimlanes, org chart and network: the stencils past the core catalog. */
import { el, n, type SvgNode } from '../svg'
import { fontOf, textLine } from '../text'
import { ellipseEl, manyPorts, pathEl, polyEl, rectEl, sidePorts, stringList, strokeEl } from './kit'
import type { BodyContext, PortDef, StencilDef } from './types'

// ---------------------------------------------------------------- containers

export const CONTAINER_STENCILS: StencilDef[] = [
  {
    id: 'containers.container',
    name: 'Container',
    category: 'containers',
    keywords: ['group', 'box', 'boundary', 'zone'],
    w: 320,
    h: 220,
    text: 'Container',
    container: true,
    style: { fill: '#f7f9fc', gradient: false, bold: true, textAlign: 'left', verticalAlign: 'middle' },
    body: (c) => [rectEl(c, 0, 0, c.w, c.h), rectEl(c, 0, 0, c.w, 26, 0, { fill: '#dce7f5' })],
    textBox: (w) => ({ x: 8, y: 2, w: w - 16, h: 22 }),
    ports: manyPorts
  },
  {
    id: 'containers.lane-horizontal',
    name: 'Swimlane (horizontal)',
    category: 'containers',
    keywords: ['swimlane', 'lane', 'pool', 'row', 'cross-functional'],
    w: 640,
    h: 150,
    text: 'Lane',
    container: true,
    style: { fill: '#ffffff', gradient: false, bold: true },
    body: (c) => {
      const s = c.style
      const out: SvgNode[] = [rectEl(c, 0, 0, c.w, c.h), rectEl(c, 0, 0, 30, c.h, 0, { fill: '#dce7f5' })]
      if (c.shape.text) out.push(textLine(c.shape.text, 0, 0, { ...fontOf(s), bold: true }, s.fontColor, 'middle', { transform: `translate(${n(19)} ${n(c.h / 2)}) rotate(-90)` }))
      return out
    },
    textBox: () => null,
    ports: manyPorts
  },
  {
    id: 'containers.lane-vertical',
    name: 'Swimlane (vertical)',
    category: 'containers',
    keywords: ['swimlane', 'lane', 'pool', 'column', 'cross-functional'],
    w: 200,
    h: 480,
    text: 'Lane',
    container: true,
    style: { fill: '#ffffff', gradient: false, bold: true },
    body: (c) => [rectEl(c, 0, 0, c.w, c.h), rectEl(c, 0, 0, c.w, 30, 0, { fill: '#dce7f5' })],
    textBox: (w) => ({ x: 4, y: 3, w: w - 8, h: 24 }),
    ports: manyPorts
  },
  {
    id: 'containers.phase',
    name: 'Phase separator',
    category: 'containers',
    keywords: ['phase', 'stage', 'milestone'],
    w: 220,
    h: 480,
    text: 'Phase',
    container: true,
    style: { fill: 'none', gradient: false, dash: 'dashed', bold: true, verticalAlign: 'top' },
    body: (c) => [rectEl(c, 0, 0, c.w, c.h, 0, { fill: 'transparent', stroke: 'none' }), strokeEl(c, `M${n(c.w)} 0 L${n(c.w)} ${n(c.h)}`), strokeEl(c, `M0 26 L${n(c.w)} 26`, { 'stroke-dasharray': undefined })],
    textBox: (w) => ({ x: 4, y: 4, w: w - 8, h: 20 }),
    ports: manyPorts
  }
]

// ---------------------------------------------------------------- org chart

function person(c: BodyContext, extra: Record<string, string | number | undefined> = {}): SvgNode[] {
  const s = c.style
  const title = typeof c.shape.data?.['title'] === 'string' ? (c.shape.data['title'] as string) : ''
  const lines = stringList(c.shape.data?.['details'])
  const font = fontOf(s)
  const rows = 1 + (title ? 1 : 0) + lines.length
  const lh = s.fontSize * 1.3
  let y = c.h / 2 - (rows * lh) / 2 + s.fontSize * 0.95
  const out: SvgNode[] = [rectEl(c, 0, 0, c.w, c.h, 4, extra)]
  if (c.shape.text) {
    out.push(textLine(c.shape.text, c.w / 2, y, { ...font, bold: true }, s.fontColor, 'middle'))
    y += lh
  }
  if (title) {
    out.push(textLine(title, c.w / 2, y, { ...font, size: s.fontSize - 1, italic: true }, s.fontColor, 'middle'))
    y += lh
  }
  for (const line of lines) {
    out.push(textLine(line, c.w / 2, y, { ...font, size: s.fontSize - 1 }, s.fontColor, 'middle'))
    y += lh
  }
  return out
}

const ORG_DATA = { description: 'title (string): the job title under the name; details (string[], optional): more lines. The text is the name.', defaults: { title: 'Title' } }

const org = (id: string, name: string, text: string, style: StencilDef['style'], extra: Record<string, string> = {}): StencilDef => ({
  id,
  name,
  category: 'orgchart',
  keywords: ['org', 'person', 'employee', 'role', 'hierarchy', name.toLowerCase()],
  w: 150,
  h: 64,
  text,
  style: { fontSize: 11, ...style },
  body: (c) => person(c, extra),
  textBox: () => null,
  data: ORG_DATA
})

export const ORGCHART_STENCILS: StencilDef[] = [
  org('orgchart.executive', 'Executive', 'Name', { fill: '#2f5487', stroke: '#1d3a63', fontColor: '#ffffff' }),
  org('orgchart.manager', 'Manager', 'Name', { fill: '#4a78b5', stroke: '#2f5487', fontColor: '#ffffff' }),
  org('orgchart.position', 'Position', 'Name', {}),
  org('orgchart.assistant', 'Assistant', 'Name', { fill: '#eef3ea', stroke: '#6a8a4a' }),
  org('orgchart.consultant', 'Consultant', 'Name', { fill: '#f7f0e4', stroke: '#a07a3a' }),
  org('orgchart.vacancy', 'Vacancy', 'Vacant', { fill: '#ffffff', gradient: false, dash: 'dashed' })
]

// ---------------------------------------------------------------- network

const ICON = 56
const labelBelow = (w: number, h: number) => ({ x: -30, y: h + 2, w: w + 60, h: 30 })
const portsBelow = (w: number, h: number): PortDef[] => [...sidePorts(w, h).filter((p) => p.id !== 's'), { id: 's', x: w / 2, y: h, dir: 's' }]

const net = (id: string, name: string, keywords: string[], body: (c: BodyContext) => SvgNode[]): StencilDef => ({
  id,
  name,
  category: 'network',
  keywords: ['network', 'it', 'infrastructure', ...keywords],
  w: ICON,
  h: ICON,
  text: name,
  keepAspect: true,
  style: { fontSize: 11, verticalAlign: 'top' },
  body: (c) => [rectEl(c, 0, 0, c.w, c.h, 0, { fill: 'transparent', stroke: 'none' }), el('g', { transform: `scale(${n(c.w / ICON)} ${n(c.h / ICON)})` }, body({ ...c, w: ICON, h: ICON }))],
  textBox: labelBelow,
  ports: portsBelow
})

export const NETWORK_STENCILS: StencilDef[] = [
  net('network.server', 'Server', ['server', 'host', 'rack'], (c) => [
    rectEl(c, 14, 2, 28, 52, 2),
    strokeEl(c, 'M18 12 H38 M18 18 H38 M18 24 H38'),
    ellipseEl(c, 36, 44, 2, 2, { fill: '#4caf50', stroke: 'none' })
  ]),
  net('network.workstation', 'Workstation', ['pc', 'desktop', 'computer', 'client'], (c) => [
    rectEl(c, 4, 4, 48, 34, 2),
    rectEl(c, 8, 8, 40, 26, 0, { fill: '#cfe3fb' }),
    pathEl(c, 'M22 38 L34 38 L37 48 L19 48 Z'),
    rectEl(c, 12, 48, 32, 5, 1)
  ]),
  net('network.laptop', 'Laptop', ['notebook', 'portable', 'client'], (c) => [
    rectEl(c, 9, 8, 38, 28, 2),
    rectEl(c, 12, 11, 32, 22, 0, { fill: '#cfe3fb' }),
    pathEl(c, 'M3 40 L53 40 L49 48 L7 48 Z')
  ]),
  net('network.database', 'Database server', ['database', 'db', 'sql', 'storage'], (c) => [
    pathEl(c, 'M8 10 A20 6 0 0 1 48 10 L48 46 A20 6 0 0 1 8 46 Z'),
    strokeEl(c, 'M8 10 A20 6 0 0 0 48 10 M8 22 A20 6 0 0 0 48 22 M8 34 A20 6 0 0 0 48 34')
  ]),
  net('network.cloud', 'Internet', ['cloud', 'internet', 'wan', 'saas'], (c) => [
    pathEl(c, 'M14 46 C4 46 2 34 10 31 C6 22 16 14 24 19 C26 8 42 8 43 19 C51 15 56 25 51 31 C57 35 54 46 46 46 Z')
  ]),
  net('network.firewall', 'Firewall', ['firewall', 'security', 'wall'], (c) => [
    rectEl(c, 4, 8, 48, 40, 0, { fill: '#e8a27a' }),
    strokeEl(c, 'M4 18 H52 M4 28 H52 M4 38 H52 M16 8 V18 M36 8 V18 M26 18 V28 M46 18 V28 M8 18 V28 M16 28 V38 M36 28 V38 M26 38 V48 M46 38 V48 M8 38 V48')
  ]),
  net('network.router', 'Router', ['router', 'gateway'], (c) => [
    ellipseEl(c, 28, 34, 24, 10),
    pathEl(c, 'M4 24 L4 34 A24 10 0 0 0 52 34 L52 24', { fill: 'none' }),
    ellipseEl(c, 28, 24, 24, 10),
    strokeEl(c, 'M18 24 L26 21 M38 24 L30 27 M24 18 L28 22 M32 30 L28 26')
  ]),
  net('network.switch', 'Switch', ['switch', 'hub', 'lan'], (c) => [
    polyEl(c, [[2, 22], [14, 12], [54, 12], [42, 22]]),
    rectEl(c, 2, 22, 40, 18),
    polyEl(c, [[42, 22], [54, 12], [54, 30], [42, 40]]),
    strokeEl(c, 'M10 31 H34 M28 27 L34 31 L28 35')
  ]),
  net('network.printer', 'Printer', ['printer', 'print'], (c) => [
    rectEl(c, 14, 4, 28, 14, 0, { fill: '#ffffff' }),
    rectEl(c, 4, 18, 48, 22, 3),
    rectEl(c, 14, 34, 28, 16, 0, { fill: '#ffffff' }),
    strokeEl(c, 'M18 40 H38 M18 45 H32')
  ]),
  net('network.phone', 'Mobile device', ['phone', 'mobile', 'tablet', 'smartphone'], (c) => [
    rectEl(c, 16, 2, 24, 52, 4),
    rectEl(c, 19, 8, 18, 36, 0, { fill: '#cfe3fb' }),
    ellipseEl(c, 28, 49, 2, 2, { fill: '#ffffff' })
  ]),
  net('network.user', 'User', ['user', 'person', 'people'], (c) => [
    ellipseEl(c, 28, 16, 10, 11),
    pathEl(c, 'M8 54 C8 36 18 30 28 30 C38 30 48 36 48 54 Z')
  ])
]
