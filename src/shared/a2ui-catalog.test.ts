import { describe, expect, it } from 'vitest'
import { A2UI_COMPONENT_NAMES, describeCatalog, describeCatalogText, validateComponent, validateServerMessages } from './a2ui-catalog'

describe('catalog', () => {
  it('lists all fixed component names', () => {
    expect(A2UI_COMPONENT_NAMES).toHaveLength(30)
    expect(A2UI_COMPONENT_NAMES).toContain('DataGridView')
  })

  it('accepts good components, with literals and bindings', () => {
    expect(validateComponent({ id: 'a', component: 'TextBox', value: { path: '/x' }, multiline: true }).ok).toBe(true)
    expect(validateComponent({ id: 'b', component: 'Button', text: 'Go', action: { name: 'go' } }).ok).toBe(true)
    expect(validateComponent({ id: 'c', component: 'DiffViewer', oldText: 'a', newText: 'b' }).ok).toBe(true)
    expect(validateComponent({ id: 'd', component: 'TreeView', nodes: [{ id: '1', text: 'x', children: [{ id: '2', text: 'y' }] }], selected: { path: '/s' } }).ok).toBe(true)
  })

  it('rejects bad components with readable errors', () => {
    const unknown = validateComponent({ id: 'a', component: 'Nope' })
    expect(unknown.ok === false && unknown.errors[0]).toContain('unknown "Nope"')
    const badEnum = validateComponent({ id: 'a', component: 'ProgressBar', value: 1, state: 'red' })
    expect(badEnum.ok).toBe(false)
    expect(validateComponent({ id: 'a', component: 'Button', text: 'x' }).ok).toBe(false)
    expect(validateComponent({ id: 'a', component: 'Label', text: 'x', bogus: 1 }).ok).toBe(false)
    expect(validateComponent({ id: 'a', component: 'DiffViewer', path: 'f' }).ok).toBe(false)
    expect(validateComponent({ component: 'Label', text: 'x' }).ok).toBe(false)
  })

  it('validates messages and drops version', () => {
    const ok = validateServerMessages([
      { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: 'c' } },
      { updateComponents: { surfaceId: 's', components: [{ id: 'root', component: 'Label', text: 'hi' }] } }
    ])
    expect(ok.ok).toBe(true)
    const bad = validateServerMessages([{ updateComponents: { surfaceId: 's', components: [{ id: 'x', component: 'Label' }] } }, { foo: 1 }])
    expect(bad.ok === false && bad.errors.some((e) => e.startsWith('messages[0]: components[0] (x)'))).toBe(true)
    expect(bad.ok === false && bad.errors.some((e) => e.startsWith('messages[1]'))).toBe(true)
  })

  it('describes every component', () => {
    const d = describeCatalog()
    expect(Object.keys(d)).toEqual(A2UI_COMPONENT_NAMES)
    expect(d.Button.action.required).toBe(true)
    expect(d.FlowLayoutPanel.flowDirection.type).toBe('"LeftToRight"|"TopDown"')
    expect(describeCatalogText()).toContain('- Label: text*')
  })
})
