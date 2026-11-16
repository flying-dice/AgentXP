import { describe, expect, it } from 'vitest'
import { A2UI_CATALOG_ID, type A2uiServerMessage, type A2uiSurfaceDto } from '../a2ui'
import { A2uiMessageValidator } from './validation'

const validator = new A2uiMessageValidator()
const create = { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: A2UI_CATALOG_ID, theme: { title: 'T' } } }
const update = (components: unknown[]) => ({ version: 'v0.9', updateComponents: { surfaceId: 's', components } })
const errorsOf = (input: unknown): string[] => {
  const r = validator.validate(input)
  return r.ok ? [] : r.errors
}

describe('A2uiMessageValidator.validate', () => {
  it('accepts a full surface with bindings, actions, templates and function calls', () => {
    const r = validator.validate([
      create,
      update([
        { id: 'root', component: 'Panel', children: ['greeting', 'name', 'ok', 'grid', 'tabs'] },
        { id: 'greeting', component: 'Label', text: { call: 'formatString', args: { value: 'Hello ${/name}' }, returnType: 'string' } },
        { id: 'name', component: 'TextBox', value: { path: '/name' }, checks: [{ condition: { call: 'required', args: { value: { path: '/name' } }, returnType: 'boolean' }, message: 'Required' }] },
        { id: 'ok', component: 'Button', text: 'OK', isDefault: true, action: { event: { name: 'submit', context: { name: { path: '/name' } } } } },
        { id: 'grid', component: 'DataGridView', columns: [{ key: 'a', header: 'A' }], rows: { path: '/rows' } },
        { id: 'tabs', component: 'TabControl', tabs: [{ title: 'One', child: 'greeting' }] }
      ]),
      { version: 'v0.9', updateDataModel: { surfaceId: 's', path: '/name', value: 'Ann' } }
    ])
    expect(r.ok).toBe(true)
  })

  it('adds the default version and keeps messages untouched otherwise', () => {
    const r = validator.validate([{ createSurface: { surfaceId: 's', catalogId: A2UI_CATALOG_ID } }])
    expect(r).toEqual({ ok: true, messages: [{ version: 'v0.9', createSurface: { surfaceId: 's', catalogId: A2UI_CATALOG_ID } }] })
  })

  it('assumes surfaces the batch does not create', () => {
    expect(validator.validate([update([{ id: 'root', component: 'Label', text: 'x' }])]).ok).toBe(true)
    expect(validator.validate([{ version: 'v0.9', deleteSurface: { surfaceId: 'whatever' } }]).ok).toBe(true)
  })

  it('rejects unknown components with the catalog id', () => {
    const [e] = errorsOf([update([{ id: 'a', component: 'Nope' }])])
    expect(e).toContain('messages[0].components[0] (a)')
    expect(e).toContain("Unknown component type 'Nope'")
  })

  it('reports every bad component of a message, not only the first', () => {
    const errors = errorsOf([update([{ id: 'a', component: 'Label' }, { id: 'ok', component: 'Label', text: 'x' }, { id: 'b', component: 'Button', text: 'x' }])])
    expect(errors).toHaveLength(2)
    expect(errors[0]).toContain('components[0] (a)')
    expect(errors[1]).toContain('components[2] (b)')
  })

  it('rejects unknown properties, bad enums and bad bindings', () => {
    expect(errorsOf([update([{ id: 'a', component: 'Label', text: 'x', bogus: 1 }])])[0]).toContain('bogus')
    expect(errorsOf([update([{ id: 'a', component: 'ProgressBar', value: 1, state: 'red' }])])).toHaveLength(1)
    expect(errorsOf([update([{ id: 'a', component: 'TextBox', value: { path: 3 } }])])).toHaveLength(1)
    expect(errorsOf([update([{ id: 'a', component: 'Label', text: { call: 'noSuchFunction', args: {} } }])])).toHaveLength(1)
  })

  it('rejects the pre-v0.9 hand-rolled action shape', () => {
    expect(errorsOf([update([{ id: 'a', component: 'Button', text: 'x', action: { name: 'go' } }])])).toHaveLength(1)
  })

  it('rejects malformed messages', () => {
    expect(errorsOf('nope')[0]).toBe('messages must be an array')
    expect(errorsOf([42])[0]).toBe('messages[0]: message must be an object')
    expect(errorsOf([{ version: 'v0.9', bogus: 1 }])[0]).toContain('exactly one')
    expect(errorsOf([{ version: 'v0.9', createSurface: { surfaceId: '' } }])).toHaveLength(1)
    expect(errorsOf([{ version: 'v0.9', updateDataModel: { surfaceId: 's', path: 'no-slash', value: 1 } }])[0]).toContain('JSON Pointer')
  })

  it('rejects other catalogs and invalid themes', () => {
    expect(errorsOf([{ version: 'v0.9', createSurface: { surfaceId: 's', catalogId: 'https://example.com/other' } }])[0]).toContain('Catalog not found')
    expect(errorsOf([{ version: 'v0.9', createSurface: { surfaceId: 's', catalogId: A2UI_CATALOG_ID, theme: { title: 3 } } }])).toHaveLength(1)
  })

  it('prefixes errors with the index of the failing message', () => {
    const errors = errorsOf([create, { nonsense: true }, update([{ id: 'x', component: 'Label' }])])
    expect(errors.map((e) => e.slice(0, 12))).toEqual(['messages[1]:', 'messages[2].'])
  })
})

describe('A2uiMessageValidator.validateAgainst', () => {
  const surface: A2uiSurfaceDto = {
    surfaceId: 's',
    sessionId: 1,
    title: 'T',
    catalogId: A2UI_CATALOG_ID,
    components: [{ id: 'root', component: 'Label', text: 'hi' }],
    dataModel: { a: 1 }
  }
  const apply = (messages: A2uiServerMessage[]): string[] => validator.validateAgainst([surface], messages)

  it('accepts updates of existing surfaces and creation of new ones', () => {
    expect(apply([update([{ id: 'b', component: 'Label', text: 'x' }]) as A2uiServerMessage])).toEqual([])
    expect(apply([{ ...create, createSurface: { ...create.createSurface, surfaceId: 'other' } } as A2uiServerMessage])).toEqual([])
  })

  it('reports unknown surfaces once per message', () => {
    const errors = validator.validateAgainst([], [update([{ id: 'a', component: 'Label', text: 'x' }, { id: 'b', component: 'Label', text: 'x' }]) as A2uiServerMessage])
    expect(errors).toEqual(['messages[0]: Surface not found for message: s'])
  })

  it('sees surfaces created and deleted earlier in the same batch', () => {
    const del = { version: 'v0.9', deleteSurface: { surfaceId: 's' } } as A2uiServerMessage
    expect(apply([del, update([{ id: 'x', component: 'Label', text: 'x' }]) as A2uiServerMessage])).toHaveLength(1)
  })
})
