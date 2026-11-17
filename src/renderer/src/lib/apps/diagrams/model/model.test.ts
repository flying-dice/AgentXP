import { describe, expect, it } from 'vitest'
import { applyAgentMethod, outline, pageIndexFor, type DiagramSession } from './agentApi'
import {
  addConnector,
  addShape,
  alignShapes,
  copyItems,
  createDoc,
  deleteItems,
  DiagramError,
  distributeShapes,
  edit,
  expandGroups,
  groupShapes,
  moveItems,
  parseDiagram,
  pasteItems,
  reorder,
  serializeDiagram,
  sheetBounds,
  updateShape
} from './document'
import { rotatedBounds, segmentCrossesRect } from './geometry'
import { History } from './history'
import { layoutPage } from './layout'
import { drawMarker } from './markers'
import { choosePorts, estimateBends, portCandidates, resolveEnd } from './ports'
import { CONNECTOR_PRESETS } from './presets'
import { connectorRoute, exportSvg, planPorts, renderConnector, renderShape, routeContext } from './render'
import { routeOrthogonal, simplify } from './routing'
import { ALL_STENCILS, STENCIL_CATEGORIES, searchStencils, stencilById, suggestStencils } from './stencils'
import { erdAttributes } from './stencils/erd'
import { normalizeColor, tint } from './style'
import { toMarkup } from './svg'
import { estimateMeasure, wrapText } from './text'
import { MARKER_KINDS, type DiagramDoc, type DiagramShape } from './types'

const m = estimateMeasure
const session = (doc: DiagramDoc = createDoc()): DiagramSession => ({ doc, page: 0, selection: [] })
const shapeOf = (stencil: string, extra: Partial<DiagramShape> = {}): DiagramShape => {
  const st = stencilById(stencil)!
  return { id: 's1', stencil, x: 10, y: 20, w: st.w, h: st.h, rotation: 0, text: st.text ?? 'Text', style: {}, ...(st.data ? { data: st.data.defaults } : {}), ...extra }
}

describe('stencil catalog', () => {
  it('has the everyday, flowchart, UML and ERD stencils, each id once', () => {
    const ids = ALL_STENCILS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThan(100)
    for (const id of ['basic.rectangle', 'flowchart.decision', 'uml.class', 'uml.lifeline', 'uml.actor', 'uml.state', 'erd.entity', 'containers.lane-horizontal', 'network.server', 'orgchart.manager']) expect(ids).toContain(id)
  })

  it('lists only known stencils in its categories', () => {
    for (const c of STENCIL_CATEGORIES) for (const id of c.stencils) expect(stencilById(id), `${c.id}: ${id}`).toBeDefined()
  })

  it('renders every stencil at its default size and when tiny', () => {
    for (const st of ALL_STENCILS) {
      for (const size of [{ w: st.w, h: st.h }, { w: 6, h: 6 }]) {
        const r = renderShape(shapeOf(st.id, size), m)
        const markup = toMarkup(r.node)
        expect(markup, st.id).toContain(`data-shape-id="s1"`)
        expect(markup, st.id).not.toMatch(/NaN|undefined|Infinity/)
      }
    }
  })

  it('searches by name and keyword, and suggests ids for a typo', () => {
    expect(searchStencils('decision').map((s) => s.id)).toContain('flowchart.decision')
    expect(searchStencils('crow').map((s) => s.id)).toContain('erd.entity')
    expect(searchStencils('table', 'erd').map((s) => s.id)).toEqual(['erd.entity'])
    expect(suggestStencils('flowchart.proces')).toContain('flowchart.process')
  })

  it('reads ERD attributes from objects and strings', () => {
    expect(erdAttributes({ data: { attributes: ['PK id int', 'FK customer_id int', 'email varchar(80) NOT NULL', { name: 'total', type: 'decimal', key: 'pk,fk' }] } })).toEqual([
      { name: 'id', type: 'int', key: 'PK', required: false },
      { name: 'customer_id', type: 'int', key: 'FK', required: false },
      { name: 'email', type: 'varchar(80)', key: '', required: true },
      { name: 'total', type: 'decimal', key: 'PK, FK', required: false }
    ])
  })

  it('grows classes and entities to fit their rows', () => {
    const { doc } = edit(createDoc(), (d) => {
      addShape(d, 0, { stencil: 'uml.class', text: 'Order', data: { attributes: ['- id: int', '- total: Money', '- lines: List<OrderLine>'], operations: ['+ submit(): void'] } }, m)
      addShape(d, 0, { stencil: 'erd.entity', text: 'customer', data: { attributes: ['PK id int', 'name varchar(80)', 'email varchar(120)', 'created_at timestamp'] } }, m)
    })
    const [cls, ent] = doc.pages[0].shapes
    expect(cls.h).toBeGreaterThan(90)
    expect(ent.h).toBeGreaterThan(100)
  })
})

describe('text', () => {
  it('wraps words to the width and splits long words', () => {
    expect(wrapText('one two three four', 60, { family: 'x', size: 10 }, m)).toEqual(['one two', 'three four'])
    expect(wrapText('abcdefghijkl', 30, { family: 'x', size: 10 }, m).length).toBeGreaterThan(1)
    expect(wrapText('a\n\nb', 100, { family: 'x', size: 10 }, m)).toEqual(['a', '', 'b'])
  })
})

describe('style', () => {
  it('normalizes colors and tints them', () => {
    expect(normalizeColor('#ABC')).toBe('#aabbcc')
    expect(normalizeColor('Red')).toBe('#ff0000')
    expect(normalizeColor('rgb(0, 128, 255)')).toBe('#0080ff')
    expect(normalizeColor('nope')).toBeNull()
    expect(tint('#000000', 0.5)).toBe('#808080')
  })
})

describe('routing', () => {
  it('goes around a shape in the way with right angles only', () => {
    const wall = { x: 100, y: -100, w: 40, h: 300 }
    const pts = routeOrthogonal({ point: { x: 0, y: 50 }, dir: 'e' }, { point: { x: 300, y: 50 }, dir: 'w' }, [wall])
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].x === pts[i - 1].x || pts[i].y === pts[i - 1].y).toBe(true)
      expect(segmentCrossesRect(pts[i - 1], pts[i], wall)).toBe(false)
    }
    expect(pts[0]).toEqual({ x: 0, y: 50 })
    expect(pts[pts.length - 1]).toEqual({ x: 300, y: 50 })
  })

  it('draws a straight run when nothing is in the way', () => {
    expect(routeOrthogonal({ point: { x: 0, y: 0 }, dir: 'e' }, { point: { x: 200, y: 0 }, dir: 'w' }, [])).toEqual([
      { x: 0, y: 0 },
      { x: 200, y: 0 }
    ])
  })

  it('drops repeated and middle points', () => {
    expect(simplify([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }])).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 }
    ])
  })

  it('glues to the facing sides, honours named ports and rotates ports with the shape', () => {
    const { doc } = edit(createDoc(), (d) => {
      addShape(d, 0, { stencil: 'basic.rectangle', x: 0, y: 0 }, m)
      addShape(d, 0, { stencil: 'basic.rectangle', x: 400, y: 0 }, m)
    })
    const page = doc.pages[0]
    const pick = choosePorts(resolveEnd(page, { shape: 's2' }, m), resolveEnd(page, { shape: 's3' }, m))
    expect([pick.a.id, pick.b.id]).toEqual(['e', 'w'])
    expect(portCandidates(page.shapes[0], 's', m)).toHaveLength(1)
    expect(portCandidates(page.shapes[0], '0.25,1', m)[0].point).toEqual({ x: 30, y: 70 })
    const rotated = { ...page.shapes[0], rotation: 90 }
    expect(portCandidates(rotated, 'n', m)[0].dir).toBe('e')
  })
})

describe('markers', () => {
  it('draws every marker kind', () => {
    for (const kind of MARKER_KINDS) {
      const g = drawMarker(kind, { x: 10, y: 10 }, 0, '#000', 1)
      if (kind === 'none') expect(g.nodes).toEqual([])
      else expect(g.nodes.length, kind).toBeGreaterThan(0)
    }
  })
})

describe('document operations', () => {
  const two = (): DiagramDoc =>
    edit(createDoc(), (d) => {
      addShape(d, 0, { stencil: 'flowchart.process', x: 0, y: 0, text: 'A' }, m)
      addShape(d, 0, { stencil: 'flowchart.process', x: 300, y: 100, text: 'B' }, m)
      addConnector(d, 0, { from: { shape: 's2' }, to: { shape: 's3' }, preset: 'flow', label: 'next' }, m)
    }).doc

  it('adds shapes with stencil defaults and refuses unknown stencils with suggestions', () => {
    const doc = two()
    expect(doc.pages[0].shapes.map((s) => [s.id, s.w, s.h])).toEqual([
      ['s2', 120, 60],
      ['s3', 120, 60]
    ])
    expect(() => edit(doc, (d) => addShape(d, 0, { stencil: 'flowchart.proces' }, m))).toThrow(/Did you mean flowchart.process/)
  })

  it('puts containers behind the other shapes', () => {
    const { doc } = edit(two(), (d) => addShape(d, 0, { stencil: 'containers.container', x: -20, y: -40 }, m))
    expect(doc.pages[0].shapes[0].stencil).toBe('containers.container')
  })

  it('deletes connectors with their shapes', () => {
    const { doc, result } = edit(two(), (d) => deleteItems(d, 0, ['s2']))
    expect(result).toEqual({ shapes: 1, connectors: 1 })
    expect(doc.pages[0].connectors).toEqual([])
  })

  it('refuses a port the shape does not have', () => {
    expect(() => edit(two(), (d) => addConnector(d, 0, { from: { shape: 's2', port: 'nope' }, to: { shape: 's3' } }, m))).toThrow(/no connection point "nope"/)
  })

  it('moves, aligns, distributes and reorders', () => {
    const base = edit(two(), (d) => addShape(d, 0, { stencil: 'flowchart.process', x: 900, y: 50 }, m)).doc
    const moved = edit(base, (d) => moveItems(d, 0, ['s2'], 10, 5)).doc
    expect([moved.pages[0].shapes[0].x, moved.pages[0].shapes[0].y]).toEqual([10, 5])
    const aligned = edit(base, (d) => alignShapes(d, 0, ['s2', 's3', 's5'], 'top')).doc
    expect(aligned.pages[0].shapes.map((s) => s.y)).toEqual([0, 0, 0])
    const spread = edit(base, (d) => distributeShapes(d, 0, ['s2', 's3', 's5'], 'horizontal')).doc
    const xs = spread.pages[0].shapes.map((s) => s.x)
    expect(xs[1] - (xs[0] + 120)).toBeCloseTo(xs[2] - (xs[1] + 120))
    const front = edit(base, (d) => reorder(d, 0, ['s2'], 'front')).doc
    expect(front.pages[0].shapes.map((s) => s.id)).toEqual(['s3', 's5', 's2'])
    const forward = edit(base, (d) => reorder(d, 0, ['s2'], 'forward')).doc
    expect(forward.pages[0].shapes.map((s) => s.id)).toEqual(['s3', 's2', 's5'])
  })

  it('groups, and selecting one member selects the group', () => {
    const { doc, result } = edit(two(), (d) => groupShapes(d, 0, ['s2', 's3']))
    expect(result).toMatch(/^g\d+$/)
    expect(expandGroups(doc.pages[0], ['s2']).sort()).toEqual(['s2', 's3'])
  })

  it('copies and pastes with new ids and keeps the connector between the copies', () => {
    const doc = two()
    const clip = copyItems(doc.pages[0], ['s2', 's3'])
    const { doc: pasted, result } = edit(doc, (d) => pasteItems(d, 0, clip, 20, 20))
    expect(result).toHaveLength(3)
    const c = pasted.pages[0].connectors[1]
    expect(c.from).toEqual({ shape: result[0] })
    expect(c.to).toEqual({ shape: result[1] })
  })

  it('updates shapes and keeps sizes sane', () => {
    const { doc } = edit(two(), (d) => updateShape(d, 0, 's2', { text: 'Renamed', w: -5, rotation: 450, style: { fill: '#ff0000', bogus: 1 } as never }, m))
    const s = doc.pages[0].shapes[0]
    expect([s.text, s.w, s.rotation, s.style]).toEqual(['Renamed', 4, 90, { fill: '#ff0000' }])
  })

  it('saves and loads the same document, and rejects other files', () => {
    const doc = two()
    expect(parseDiagram(serializeDiagram(doc))).toEqual(doc)
    expect(() => parseDiagram('{"format":"other","pages":[]}')).toThrow(DiagramError)
    expect(() => parseDiagram('not json')).toThrow(/not valid JSON/)
    const repaired = parseDiagram({ pages: [{ shapes: [{ id: 'a', stencil: 'basic.rectangle' }, { id: 'a' }], connectors: [{ from: { shape: 'a' }, to: { shape: 'zzz' } }] }] })
    expect(repaired.pages[0].shapes.map((s) => s.id)).toEqual(['a', 's2'])
    expect(repaired.pages[0].connectors).toEqual([])
  })

  it('grows the sheet by whole pages when shapes go past the paper', () => {
    const { doc } = edit(createDoc(), (d) => addShape(d, 0, { stencil: 'basic.rectangle', x: 1100, y: 10 }, m))
    expect(sheetBounds(doc.pages[0])).toEqual({ x: 0, y: 0, w: 2112, h: 816 })
  })

  it('undoes and redoes', () => {
    const h = new History()
    const a = createDoc('A')
    const b = createDoc('B')
    h.push(a, 'Rename')
    expect(h.undoLabel).toBe('Rename')
    expect(h.undo(b)?.title).toBe('A')
    expect(h.redo(a)?.title).toBe('B')
  })
})

describe('layout', () => {
  it('lays a chain out top to bottom and left to right', () => {
    const base = edit(createDoc(), (d) => {
      for (const t of ['A', 'B', 'C']) addShape(d, 0, { stencil: 'flowchart.process', text: t, x: 0, y: 0 }, m)
      addConnector(d, 0, { from: { shape: 's2' }, to: { shape: 's3' } }, m)
      addConnector(d, 0, { from: { shape: 's3' }, to: { shape: 's4' } }, m)
    }).doc
    const tb = edit(base, (d) => layoutPage(d, 0, { direction: 'TB' })).doc.pages[0].shapes
    expect(tb[0].y).toBeLessThan(tb[1].y)
    expect(tb[1].y).toBeLessThan(tb[2].y)
    const lr = edit(base, (d) => layoutPage(d, 0, { direction: 'LR' })).doc.pages[0].shapes
    expect(lr[0].x).toBeLessThan(lr[1].x)
    const grid = edit(base, (d) => layoutPage(d, 0, { algorithm: 'grid', columns: 3 })).doc.pages[0].shapes
    expect(new Set(grid.map((s) => s.y)).size).toBe(1)
  })
})

describe('the agent methods', () => {
  it('builds a flowchart in one call with refs, presets and layout', () => {
    const out = applyAgentMethod(
      session(),
      'add',
      {
        shapes: [
          { ref: 'start', stencil: 'flowchart.terminator', text: 'Start' },
          { ref: 'ask', stencil: 'flowchart.decision', text: 'In stock?' },
          { ref: 'ship', stencil: 'flowchart.process', text: 'Ship order' },
          { ref: 'end', stencil: 'flowchart.terminator', text: 'End' }
        ],
        connectors: [
          { from: 'start', to: 'ask' },
          { from: 'ask', to: 'ship', label: 'yes' },
          { from: 'ask', to: 'end', label: 'no', preset: 'dashed' },
          { from: 'ship', to: 'end' }
        ],
        layout: { direction: 'TB' }
      },
      m
    )
    const page = out.session.doc.pages[0]
    expect(page.shapes).toHaveLength(4)
    expect(page.connectors).toHaveLength(4)
    expect(out.text).toMatch(/Refs: \{"start":"s2"/)
    expect(out.change).toBe('Agent: add')
    expect(page.connectors[2].style).toMatchObject({ dash: 'dashed', endMarker: 'open-arrow' })
    expect(page.shapes[0].y).toBeLessThan(page.shapes[1].y)
  })

  it('explains mistakes: unknown refs, stencils and pages', () => {
    expect(() => applyAgentMethod(session(), 'add', { connectors: [{ from: 'x', to: 'y' }] }, m)).toThrow(/no shape or ref "x"/)
    expect(() => applyAgentMethod(session(), 'add', { shapes: [{ stencil: 'uml.klass' }] }, m)).toThrow(/Unknown stencil "uml.klass"/)
    expect(() => pageIndexFor(createDoc(), 0, 3)).toThrow(/no page 3/)
  })

  it('makes level sequence messages with y and glues ERD lines to attribute rows', () => {
    const out = applyAgentMethod(
      session(),
      'add',
      {
        shapes: [
          { ref: 'a', stencil: 'uml.lifeline', text: 'Client', x: 40, y: 40 },
          { ref: 'b', stencil: 'uml.lifeline', text: 'Server', x: 260, y: 40 },
          { ref: 'cust', stencil: 'erd.entity', text: 'customer', x: 40, y: 500, data: { attributes: ['PK id int', 'name text'] } },
          { ref: 'ord', stencil: 'erd.entity', text: 'order', x: 400, y: 520, data: { attributes: ['PK id int', 'FK customer_id int'] } }
        ],
        connectors: [
          { from: 'a', to: 'b', preset: 'uml.message', label: 'GET /items', y: 120 },
          { from: 'cust', to: 'ord', fromPort: 'id', toPort: 'customer_id', preset: 'erd.one-to-many' }
        ]
      },
      m
    )
    const page = out.session.doc.pages[0]
    const msg = connectorRoute(page, page.connectors[0], m)
    expect(msg.points[0].y).toBe(120)
    expect(msg.points[msg.points.length - 1].y).toBe(120)
    expect(page.connectors[0].from).toEqual({ shape: 's2', port: 'y=80' })
    const fk = connectorRoute(page, page.connectors[1], m)
    expect(fk.points[0].x).toBe(page.shapes[2].x + page.shapes[2].w)
    expect(fk.points[fk.points.length - 1].x).toBe(page.shapes[3].x)
  })

  it('updates, arranges, deletes, pages and reads', () => {
    let s = applyAgentMethod(session(), 'add', { shapes: [{ stencil: 'basic.rectangle', x: 0, y: 0 }, { stencil: 'basic.ellipse', x: 200, y: 40 }], connectors: [{ from: 's2', to: 's3' }] }, m).session
    s = applyAgentMethod(s, 'update', { shapes: [{ id: 's2', text: 'Hello', style: { fill: 'lightblue' } }], connectors: [{ id: 'c4', label: 'link', routing: 'curved' }] }, m).session
    expect(s.doc.pages[0].shapes[0]).toMatchObject({ text: 'Hello', style: { fill: 'lightblue' } })
    expect(s.doc.pages[0].connectors[0]).toMatchObject({ label: 'link', routing: 'curved' })
    s = applyAgentMethod(s, 'arrange', { ids: ['s2', 's3'], action: 'align-top' }, m).session
    expect(s.doc.pages[0].shapes.map((x) => x.y)).toEqual([0, 0])
    s = applyAgentMethod(s, 'pages', { action: 'add', name: 'Details' }, m).session
    expect([s.page, s.doc.pages[1].name]).toEqual([1, 'Details'])
    const read = applyAgentMethod(s, 'read', { page: 1 }, m).text
    expect(read).toContain('s2 basic.rectangle "Hello"')
    expect(read).toContain('c4 s2 -> s3 curved "link"')
    s = applyAgentMethod(s, 'delete', { ids: ['s3'], page: 'Page-1' }, m).session
    expect(outline(s.doc, 0)).toContain('Connectors (0)')
    expect(applyAgentMethod(s, 'stencils', { query: 'entity' }, m).text).toContain('erd.entity')
    expect(() => applyAgentMethod(s, 'pages', { action: 'delete', page: 1 }, m)).not.toThrow()
  })

  it('exports SVG with the shapes, labels and gradients', () => {
    const s = applyAgentMethod(session(), 'add', { shapes: [{ stencil: 'flowchart.process', text: 'Pay <now>', x: 0, y: 0 }, { stencil: 'flowchart.terminator', text: 'Done', x: 0, y: 200 }], connectors: [{ from: 's2', to: 's3', label: 'ok' }] }, m).session
    const svg = applyAgentMethod(s, 'export-svg', {}, m).text
    expect(svg).toMatch(/^<\?xml/)
    expect(svg).toContain('Pay &lt;now&gt;')
    expect(svg).toContain('linearGradient')
    expect(svg).toContain('>ok<')
    const { width } = exportSvg(s.doc, 0, m, { area: 'page' })
    expect(width).toBe(1056)
  })

  it('every preset makes a connector that renders', () => {
    for (const p of CONNECTOR_PRESETS) {
      const s = applyAgentMethod(session(), 'add', { shapes: [{ stencil: 'basic.rectangle', x: 0, y: 0 }, { stencil: 'basic.rectangle', x: 300, y: 200 }], connectors: [{ from: 's2', to: 's3', preset: p.id }] }, m).session
      const page = s.doc.pages[0]
      expect(toMarkup(renderConnector(page, page.connectors[0], m).node), p.id).not.toMatch(/NaN/)
    }
  })

  it('rotated shapes report rotated bounds', () => {
    expect(rotatedBounds({ x: 0, y: 0, w: 100, h: 20 }, 90)).toEqual({ x: 40, y: -40, w: 20, h: 100 })
  })
})

describe('port choice prefers fewer bends', () => {
  const port = (x: number, y: number, dir: 'n' | 's' | 'e' | 'w') => ({ id: dir, point: { x, y }, dir })

  it('counts the bends of a straight line, an L, a Z and a dogleg', () => {
    expect(estimateBends(port(0, 0, 's'), port(0, 100, 'n'))).toBe(0)
    expect(estimateBends(port(0, 0, 'e'), port(100, 100, 'n'))).toBe(1)
    expect(estimateBends(port(0, 0, 's'), port(60, 100, 'n'))).toBe(2)
    expect(estimateBends(port(0, 0, 'e'), port(10, 150, 'w'))).toBe(4)
  })

  it('joins a shape below and to the right with an L, not a dogleg', () => {
    const decision: DiagramShape = { id: 'd', stencil: 'flowchart.decision', x: 143, y: 331, w: 120, h: 80, text: '', rotation: 0, style: {} }
    const home: DiagramShape = { id: 'h', stencil: 'flowchart.process', x: 273, y: 497, w: 120, h: 60, text: '', rotation: 0, style: {} }
    const page = { id: 'p', name: 'P', width: 1000, height: 800, shapes: [decision, home], connectors: [] }
    const m = estimateMeasure
    const { a, b } = choosePorts(resolveEnd(page as never, { shape: 'd' }, m), resolveEnd(page as never, { shape: 'h' }, m))
    expect(estimateBends(a, b)).toBe(1)
  })

  it('plans the ports of a whole page: the two exits of a decision and a loop back do not share a line', () => {
    const shape = (id: string, stencil: string, x: number, y: number, w: number, h: number): DiagramShape => ({ id, stencil, x, y, w, h, text: '', rotation: 0, style: {} })
    const shapes = [shape('start', 'flowchart.terminator', 369, 212, 120, 50), shape('check', 'flowchart.decision', 369, 331, 120, 80), shape('login', 'flowchart.process', 329, 497, 120, 60), shape('home', 'flowchart.process', 498, 497, 120, 60)]
    const link = (id: string, from: string, to: string) => ({ id, from: { shape: from }, to: { shape: to }, routing: 'orthogonal', style: {}, label: '' })
    const connectors = [link('c1', 'start', 'check'), link('yes', 'check', 'home'), link('no', 'check', 'login'), link('back', 'login', 'check')]
    const page = { id: 'p', name: 'P', width: 1000, height: 800, shapes, connectors } as never
    const plan = planPorts(page, estimateMeasure, routeContext(page))
    expect(plan.get('yes')!.a.id).not.toBe(plan.get('no')!.a.id)
    const no = plan.get('no')!
    const back = plan.get('back')!
    expect([back.a.id, back.b.id]).not.toEqual([no.b.id, no.a.id])
    expect(estimateBends(plan.get('yes')!.a, plan.get('yes')!.b)).toBeLessThanOrEqual(1)
  })
})
