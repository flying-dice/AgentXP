import { Catalog } from '@a2ui/web_core/v0_9'
import { describe, expect, it } from 'vitest'
import { A2UI_CATALOG_ID } from '../a2ui'
import { createWinformsCatalog, winformsCatalog } from './catalog'
import document from './winforms-catalog.json'

const EXPECTED = [
  'Panel', 'FlowLayoutPanel', 'TableLayoutPanel', 'GroupBox', 'TabControl', 'SplitContainer',
  'Label', 'LinkLabel', 'Button', 'CheckBox', 'RadioButtonGroup', 'TextBox', 'NumericUpDown', 'ComboBox',
  'ListBox', 'CheckedListBox', 'ProgressBar', 'TrackBar', 'DateTimePicker', 'MonthCalendar', 'PictureBox',
  'TreeView', 'ListView', 'DataGridView', 'PropertyGrid', 'CodeViewer', 'DiffViewer', 'ConsoleView', 'Markdown', 'MessageBoxPanel'
]

describe('WinForms catalog', () => {
  it('keeps the component set and the catalog id', () => {
    expect([...winformsCatalog.components.keys()].sort()).toEqual([...EXPECTED].sort())
    expect(winformsCatalog.id).toBe(A2UI_CATALOG_ID)
    expect(document.catalogId).toBe(A2UI_CATALOG_ID)
    expect(winformsCatalog.protocolVersion).toBe('0.9')
  })

  it('describes every component and its properties', () => {
    const doc = winformsCatalog.toJson() as { components: Record<string, { allOf: { description?: string; properties?: Record<string, { description?: string }> }[] }> }
    for (const name of EXPECTED) {
      const body = doc.components[name]!.allOf.at(-1)!
      expect(body.description ?? '', `${name} description`).not.toBe('')
      for (const [prop, schema] of Object.entries(body.properties ?? {})) {
        if (prop === 'component') continue
        expect(schema.description, `${name}.${prop} description`).toBeTruthy()
      }
    }
  })

  it('is a loadable catalog document that round-trips through web_core', () => {
    const json = winformsCatalog.toJson()
    expect(json.catalogId).toBe(A2UI_CATALOG_ID)
    expect(Object.keys(json.components as object)).toHaveLength(30)
    expect(Object.keys(json.functions as object)).toContain('formatString')
    expect(String(json.instructions)).toContain('a2ui_render')
    const again = Catalog.fromJson(json).toJson()
    expect(again.components).toEqual(json.components)
    expect(Object.keys(winformsCatalog.validationSchema)).toContain('$defs')
  })

  it('creates independent catalogs with executable functions', () => {
    const other = createWinformsCatalog()
    expect(other).not.toBe(winformsCatalog)
    expect(other.functions.has('formatString')).toBe(true)
    expect(typeof other.functions.get('formatString')?.execute).toBe('function')
  })

  it('uses the standard binding, action and child conventions', () => {
    const body = (name: string) => {
      const doc = winformsCatalog.toJson() as { components: Record<string, { allOf: { properties?: Record<string, { $ref?: string }> }[] }> }
      return doc.components[name]!.allOf.at(-1)!.properties!
    }
    expect(body('Button').action!.$ref).toMatch(/common_types\.json#\/\$defs\/Action$/)
    expect(body('Panel').children!.$ref).toMatch(/\$defs\/ChildList$/)
    expect(body('TextBox').value!.$ref).toMatch(/\$defs\/DynamicString$/)
    expect(body('CheckBox').checked!.$ref).toMatch(/\$defs\/DynamicBoolean$/)
    expect(body('SplitContainer').panel1!.$ref).toMatch(/\$defs\/ComponentId$/)
  })
})
