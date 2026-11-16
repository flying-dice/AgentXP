import { isComponentNode, peekValue, type ComponentNode } from '@a2ui/web_core/v0_9'
import { describe, expect, it, vi } from 'vitest'
import { A2UI_CATALOG_ID, type A2uiClientEvent, type A2uiServerMessage } from '@shared/a2ui'
import { SurfaceController } from './SurfaceController'
import { asNodes, setterOf, toViewProps, type ViewProps } from './viewProps'

const v = 'v0.9' as const
const create = (title?: string): A2uiServerMessage => ({ version: v, createSurface: { surfaceId: 's', catalogId: A2UI_CATALOG_ID, ...(title ? { theme: { title } } : {}) } })
const components = (list: Record<string, unknown>[]): A2uiServerMessage => ({ version: v, updateComponents: { surfaceId: 's', components: list } })
const data = (path: string | undefined, value: unknown): A2uiServerMessage => ({ version: v, updateDataModel: { surfaceId: 's', ...(path ? { path } : {}), value } })

const form = (): A2uiServerMessage[] => [
  create('Greeting'),
  components([
    { id: 'root', component: 'Panel', children: ['name', 'hello', 'ok', 'tabs'] },
    { id: 'name', component: 'TextBox', value: { path: '/name' } },
    { id: 'hello', component: 'Label', text: { call: 'formatString', args: { value: 'Hello ${/name}!' }, returnType: 'string' } },
    { id: 'ok', component: 'Button', text: 'OK', action: { event: { name: 'submit', context: { name: { path: '/name' }, kind: 'static' } } } },
    { id: 'tabs', component: 'TabControl', tabs: [{ title: 'One', child: 'hello' }] }
  ]),
  data('/name', 'Ann')
]

const view = (node: ComponentNode): ViewProps => toViewProps(peekValue(node.props))
const childOf = (root: ComponentNode, id: string): ComponentNode => {
  const found = asNodes(view(root).children).find((c) => c.componentId === id)
  if (!found) throw new Error(`no child ${id}`)
  return found
}

describe('SurfaceController', () => {
  it('resolves the root, its children, bindings and the title', () => {
    const c = new SurfaceController()
    c.sync(form())
    const root = peekValue(c.root)!
    expect(root.type).toBe('Panel')
    expect(asNodes(view(root).children).map((n) => n.componentId)).toEqual(['name', 'hello', 'ok', 'tabs'])
    expect(view(childOf(root, 'name')).value).toBe('Ann')
    expect(view(childOf(root, 'hello')).text).toBe('Hello Ann!')
    expect(view(childOf(root, 'ok')).text).toBe('OK')
    expect(peekValue(c.title)).toBe('Greeting')
  })

  it('resolves child references nested in arrays (TabControl.tabs[].child)', () => {
    const c = new SurfaceController()
    c.sync(form())
    const tabs = view(childOf(peekValue(c.root)!, 'tabs')).tabs as { title: string; child: unknown }[]
    expect(tabs[0]!.title).toBe('One')
    expect(isComponentNode(tabs[0]!.child)).toBe(true)
  })

  it('writes two-way bindings back through the data model and re-resolves dependants', () => {
    const c = new SurfaceController()
    c.sync(form())
    const root = peekValue(c.root)!
    setterOf(view(childOf(root, 'name')), 'value')('Bob')
    expect((c.dataModel() as { name: string }).name).toBe('Bob')
    expect(view(childOf(root, 'name')).value).toBe('Bob')
    expect(view(childOf(root, 'hello')).text).toBe('Hello Bob!')
  })

  it('maps actions to client events with the context resolved and the data model attached', async () => {
    const events: A2uiClientEvent[] = []
    const c = new SurfaceController({ sessionId: 7, onaction: (e) => events.push(e) })
    c.sync(form())
    const root = peekValue(c.root)!
    setterOf(view(childOf(root, 'name')), 'value')('Cy')
    const action = view(childOf(root, 'ok')).action as () => Promise<void>
    await action()
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      sessionId: 7,
      surfaceId: 's',
      sourceComponentId: 'ok',
      action: { name: 'submit', context: { name: 'Cy', kind: 'static' } },
      dataModel: { name: 'Cy' }
    })
    expect(Date.parse(events[0]!.timestamp)).not.toBeNaN()
  })

  it('omits sessionId when none is given and tolerates a missing handler', async () => {
    const events: A2uiClientEvent[] = []
    const c = new SurfaceController({ onaction: (e) => events.push(e) })
    c.sync(form())
    await (view(childOf(peekValue(c.root)!, 'ok')).action as () => Promise<void>)()
    expect('sessionId' in events[0]!).toBe(false)
    const quiet = new SurfaceController()
    quiet.sync(form())
    await expect((view(childOf(peekValue(quiet.root)!, 'ok')).action as () => Promise<void>)()).resolves.toBeUndefined()
  })

  it('applies appended messages incrementally and keeps local edits', () => {
    const c = new SurfaceController()
    const base = form()
    c.sync(base)
    const root = peekValue(c.root)!
    setterOf(view(childOf(root, 'name')), 'value')('Local')
    c.sync([...base, data('/extra', 1)])
    expect(peekValue(c.root)).toBe(root)
    expect((c.dataModel() as Record<string, unknown>).name).toBe('Local')
    expect((c.dataModel() as Record<string, unknown>).extra).toBe(1)
  })

  it('patches in place when a snapshot only changes upserts, keeping the node tree', () => {
    const c = new SurfaceController()
    const base = form()
    c.sync(base)
    const root = peekValue(c.root)!
    // Same length, only the updateComponents entry differs, so it is applied on top.
    c.sync([base[0]!, components([{ id: 'root', component: 'Panel', children: ['name', 'hello', 'ok', 'tabs'] }, { id: 'name', component: 'TextBox', value: { path: '/name' } }, { id: 'hello', component: 'Label', text: 'x' }, { id: 'ok', component: 'Button', text: 'Send', action: { event: { name: 'send' } } }, { id: 'tabs', component: 'TabControl', tabs: [{ title: 'One', child: 'hello' }] }]), base[2]!])
    expect(peekValue(c.root)).toBe(root)
    expect(view(childOf(root, 'ok')).text).toBe('Send')
    expect(view(childOf(root, 'hello')).text).toBe('x')
  })

  it('rebuilds when createSurface changes or the surface is deleted', () => {
    const c = new SurfaceController()
    c.sync(form())
    const first = peekValue(c.root)!
    const next = form()
    next[0] = create('Other')
    c.sync(next)
    expect(peekValue(c.root)).not.toBe(first)
    expect(peekValue(c.title)).toBe('Other')
    c.sync([...next, { version: v, deleteSurface: { surfaceId: 's' } }])
    expect(peekValue(c.root)).toBeUndefined()
  })

  it('reports invalid messages and keeps the rest of the surface', () => {
    const errors: string[] = []
    const c = new SurfaceController({ onerror: (m) => errors.push(m) })
    c.sync([create(), components([{ id: 'root', component: 'Label', text: 'ok' }]), components([{ id: 'bad', component: 'Nope' }])])
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("Unknown component type 'Nope'")
    expect(view(peekValue(c.root)!).text).toBe('ok')
  })

  it('renders nothing before the root arrives and after dispose', () => {
    const c = new SurfaceController()
    c.sync([create()])
    expect(peekValue(c.root)).toBeUndefined()
    c.sync([create(), components([{ id: 'root', component: 'Label', text: 'late' }])])
    expect(peekValue(c.root)?.type).toBe('Label')
    c.dispose()
    expect(peekValue(c.root)).toBeUndefined()
  })

  it('warns instead of throwing when no onerror is set', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new SurfaceController().sync([create(), components([{ id: 'x', component: 'Nope' }])])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
