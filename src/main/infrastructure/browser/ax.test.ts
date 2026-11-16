import { describe, expect, it } from 'vitest'
import { collectItems, findItems, offscreenNodes, outlineLines, textLines, type AxNode, type OutlineSource } from './ax'
import { RefTable } from './refs'

let counter = 0
const n = (role: string, name: string, extra: Partial<AxNode> & { props?: Record<string, unknown> } = {}, childIds: string[] = []): AxNode => {
  const { props, ...rest } = extra
  return {
    nodeId: `n${++counter}`,
    role: { value: role },
    name: { value: name },
    backendDOMNodeId: 100 + counter,
    childIds,
    properties: Object.entries(props ?? {}).map(([name, value]) => ({ name, value: { value } })),
    ...rest
  }
}

/** Builds a flat node list from a nested description; sets parentIds. */
function tree(spec: Spec): AxNode[] {
  const out: AxNode[] = []
  const make = (s: Spec, parentId?: string): AxNode => {
    const node = n(s.role, s.name ?? '', { ...(s.extra ?? {}), parentId })
    out.push(node)
    node.childIds = (s.kids ?? []).map((k) => make(k, node.nodeId).nodeId)
    return node
  }
  make(spec)
  return out
}
interface Spec {
  role: string
  name?: string
  extra?: Partial<AxNode> & { props?: Record<string, unknown> }
  kids?: Spec[]
}
const text = (name: string): Spec => ({ role: 'StaticText', name })

const source = (nodes: AxNode[], more: Partial<OutlineSource> = {}): OutlineSource => ({ rootFrameId: 'main', frames: new Map([['main', nodes]]), iframeChild: new Map(), ...more })

const page: Spec = {
  role: 'RootWebArea',
  name: 'Team chat',
  kids: [
    {
      role: 'generic',
      kids: [
        { role: 'heading', name: 'general', extra: { props: { level: 1 } }, kids: [text('general')] },
        { role: 'button', name: 'Send', kids: [text('Send')] },
        { role: 'listitem', kids: [{ role: 'generic', kids: [text('Ann'), text(': hello')] }, { role: 'button', name: 'Reply', kids: [text('Reply')] }] },
        { role: 'textbox', name: 'Message', extra: { props: { editable: 'richtext', focused: true, multiline: true } }, kids: [] }
      ]
    }
  ]
}

describe('outline', () => {
  it('folds generic containers, drops duplicate text and puts refs on interactive nodes', () => {
    const items = collectItems(source(tree(page)))
    const lines = outlineLines(items, new RefTable())
    expect(lines).toEqual([
      'heading "general" (level 1)',
      '[1] button "Send"',
      'listitem',
      '  text "Ann"',
      '  text ": hello"',
      '  [2] button "Reply"',
      '[3] textbox "Message" (focused, multiline, editable)'
    ])
  })

  it('gives the same ref to the same node when read again', () => {
    const src = source(tree(page))
    const refs = new RefTable()
    expect(outlineLines(collectItems(src), refs)).toEqual(outlineLines(collectItems(src), refs))
  })

  it('shows link targets, states and off-screen marks', () => {
    const nodes = tree({
      role: 'RootWebArea',
      kids: [
        { role: 'link', name: 'Docs', extra: { props: { url: 'https://x.example/docs' } } },
        { role: 'checkbox', name: 'Agree', extra: { props: { checked: 'true', disabled: true } } },
        { role: 'button', name: 'Far away' }
      ]
    })
    const far = nodes.find((x) => x.name?.value === 'Far away')!.backendDOMNodeId!
    const lines = outlineLines(collectItems(source(nodes, { offscreen: (_f, b) => b === far })), new RefTable())
    expect(lines[0]).toBe('[1] link "Docs" -> https://x.example/docs')
    expect(lines[1]).toBe('[2] checkbox "Agree" (disabled, checked)')
    expect(lines[2]).toBe('[3] button "Far away" [off-screen]')
  })

  it('never shows the value of a password field', () => {
    const nodes = tree({ role: 'RootWebArea', kids: [{ role: 'textbox', name: 'Password', extra: { value: { value: 'hunter2' } } }, { role: 'textbox', name: 'User', extra: { value: { value: 'ann' } } }] })
    const pw = nodes[1].backendDOMNodeId!
    const lines = outlineLines(collectItems(source(nodes, { redact: (_f, b) => b === pw })), new RefTable())
    expect(lines.join('\n')).not.toContain('hunter2')
    expect(lines[0]).toBe('[1] textbox "Password" (password)')
    expect(lines[1]).toBe('[2] textbox "User" value="ann"')
  })

  it('walks into iframes of another frame and notes the ones it cannot read', () => {
    const main = tree({ role: 'RootWebArea', kids: [{ role: 'Iframe', name: 'Search', kids: [] }, { role: 'Iframe', name: 'Locked' }] })
    const frame = tree({ role: 'RootWebArea', kids: [{ role: 'searchbox', name: 'Find messages' }] })
    const [a] = main.filter((x) => x.role?.value === 'Iframe')
    const src = source(main, { iframeChild: new Map([[`main:${a.backendDOMNodeId}`, 'child']]) })
    src.frames.set('child', frame)
    const lines = outlineLines(collectItems(src), new RefTable())
    expect(lines).toEqual(['iframe "Search"', '  [1] searchbox "Find messages"', 'iframe "Locked" [content could not be read]'])
  })

  it('walks embedded iframe content (shadow roots are part of the tree)', () => {
    const nodes = tree({ role: 'RootWebArea', kids: [{ role: 'Iframe', kids: [{ role: 'RootWebArea', kids: [{ role: 'button', name: 'Inner' }] }] }, { role: 'button', name: 'Hosted in shadow' }] })
    expect(outlineLines(collectItems(source(nodes)), new RefTable())).toEqual(['iframe', '  [1] button "Inner"', '[2] button "Hosted in shadow"'])
  })

  it('skips ignored nodes but keeps their children', () => {
    const nodes = tree({ role: 'RootWebArea', kids: [{ role: 'group', name: 'Hidden wrapper', extra: { ignored: true }, kids: [{ role: 'button', name: 'Visible child' }] }] })
    expect(outlineLines(collectItems(source(nodes)), new RefTable())).toEqual(['[1] button "Visible child"'])
  })

  it('does not loop on a cycle', () => {
    const nodes = tree({ role: 'RootWebArea', kids: [{ role: 'button', name: 'A' }] })
    nodes[1].childIds = [nodes[0].nodeId]
    expect(outlineLines(collectItems(source(nodes)), new RefTable())).toEqual(['[1] button "A"'])
  })
})

describe('text mode', () => {
  it('gives one line per block, headings with #, table rows with |', () => {
    const nodes = tree({
      role: 'RootWebArea',
      kids: [
        { role: 'heading', name: 'Title', extra: { props: { level: 2 } }, kids: [text('Title')] },
        { role: 'listitem', kids: [{ role: 'generic', kids: [text('Ann'), text(': hi')] }] },
        { role: 'row', kids: [{ role: 'cell', kids: [text('A')] }, { role: 'cell', kids: [text('B')] }] },
        { role: 'generic', kids: [text('Loose text')] }
      ]
    })
    expect(textLines(collectItems(source(nodes)))).toEqual(['## Title', 'Ann : hi', 'A | B', 'Loose text'])
  })
})

describe('find', () => {
  const items = collectItems(source(tree(page)))
  it('finds by role and name', () => {
    const hits = findItems(items, { role: 'button', name: 'rep' })
    expect(hits.map((h) => items[h.index].name)).toEqual(['Reply'])
    expect(findItems(items, { role: 'textbox' })).toHaveLength(1)
  })

  it('finds by text and returns the element around plain text, with context', () => {
    const hits = findItems(items, { text: 'hello' })
    expect(hits).toHaveLength(1)
    expect(items[hits[0].index].role).toBe('listitem')
    expect(hits[0].context).toBe('Ann : hello Reply')
  })

  it('returns nothing without a query', () => {
    expect(findItems(items, {})).toEqual([])
  })
})

describe('offscreenNodes', () => {
  it('marks nodes outside the viewport at the scroll offset', () => {
    const doc = {
      nodes: { backendNodeId: [1, 2, 3, 4] },
      layout: {
        nodeIndex: [0, 1, 2, 3],
        bounds: [
          [0, 0, 100, 20], // inside
          [0, 900, 100, 20], // below
          [0, 600, 100, 50], // inside after scrolling 500
          [0, 100, 100, 20] // above after scrolling 500
        ]
      },
      scrollOffsetX: 0,
      scrollOffsetY: 500
    }
    expect([...offscreenNodes({ ...doc, scrollOffsetY: 0 }, { width: 800, height: 600 })]).toEqual([2, 3])
    expect([...offscreenNodes(doc, { width: 800, height: 600 })].sort()).toEqual([1, 4])
  })
})
