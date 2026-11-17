import { describe, expect, it } from 'vitest'
import { DiagramEditor } from './editor.svelte'
import { estimateMeasure } from './model/text'

const make = (): DiagramEditor => new DiagramEditor(estimateMeasure)

describe('DiagramEditor', () => {
  it('records one undo step per change, with labels for the menu', () => {
    const e = make()
    expect(e.undoLabel).toBeNull()
    const a = e.addShape({ stencil: 'flowchart.process', x: 40, y: 40, text: 'A' })
    const b = e.addShape({ stencil: 'flowchart.process', x: 40, y: 200, text: 'B' })
    e.addConnector({ from: { shape: a }, to: { shape: b } })
    expect(e.page.connectors).toHaveLength(1)
    expect(e.undoLabel).toBe('Add connector')
    expect(e.dirty).toBe(true)
    e.undo()
    expect(e.page.connectors).toHaveLength(0)
    expect(e.redoLabel).toBe('Add connector')
    e.redo()
    expect(e.page.connectors).toHaveLength(1)
  })

  it('moves, aligns, groups and deletes the selection', () => {
    const e = make()
    const a = e.addShape({ stencil: 'basic.rectangle', x: 0, y: 0 })
    const b = e.addShape({ stencil: 'basic.rectangle', x: 300, y: 50 })
    e.select([a, b])
    e.align('top')
    expect(e.page.shapes.map((s) => s.y)).toEqual([0, 0])
    e.group()
    e.select([a])
    expect(e.selection.sort()).toEqual([a, b].sort())
    e.move([a, b], 10, 5)
    expect(e.page.shapes.map((s) => [s.x, s.y])).toEqual([
      [10, 5],
      [310, 5]
    ])
    e.deleteSelection()
    expect(e.page.shapes).toHaveLength(0)
    expect(e.selection).toEqual([])
  })

  it('copies and pastes with new ids, offset each time', () => {
    const e = make()
    const a = e.addShape({ stencil: 'basic.ellipse', x: 100, y: 100 })
    e.select([a])
    expect(e.copy()).toBe(true)
    e.paste()
    const pasted = e.page.shapes[1]
    expect(pasted.id).not.toBe(a)
    expect(pasted.x).toBeGreaterThan(100)
    expect(e.selection).toEqual([pasted.id])
    e.duplicate()
    expect(e.page.shapes).toHaveLength(3)
  })

  it('works with pages: add, rename, duplicate and delete keep the current page valid', () => {
    const e = make()
    e.addPage()
    expect(e.doc.pages).toHaveLength(2)
    expect(e.pageIndex).toBe(1)
    e.renamePage(1, 'Data model')
    expect(e.page.name).toBe('Data model')
    e.duplicatePage()
    expect(e.doc.pages).toHaveLength(3)
    e.deletePage(0)
    expect(e.doc.pages.map((p) => p.name)).toEqual(['Data model', expect.stringContaining('Data model')])
    expect(e.pageIndex).toBeLessThan(2)
    e.deletePage()
    e.deletePage()
    expect(e.doc.pages).toHaveLength(1)
  })

  it('applies agent calls as one undo step, flashes what changed and follows its page and selection', () => {
    const e = make()
    const out = e.agent('add', { shapes: [{ ref: 'a', stencil: 'uml.class', text: 'Order' }, { ref: 'b', stencil: 'uml.class', text: 'Line' }], connectors: [{ from: 'a', to: 'b', preset: 'uml.composition' }] })
    expect(out.text).toMatch(/Added 2 shapes and 1 connector/)
    expect(e.undoLabel).toMatch(/^Agent/)
    expect(e.flash.length).toBeGreaterThan(0)
    e.agent('pages', { action: 'add', name: 'Second' })
    expect(e.pageIndex).toBe(1)
    e.agent('pages', { action: 'select', page: 1 })
    expect(e.pageIndex).toBe(0)
    e.agent('select', { ids: ['s2'] })
    expect(e.selection).toEqual(['s2'])
    e.undo()
    e.undo()
    expect(e.page.shapes).toHaveLength(0)
    expect(() => e.agent('add', { shapes: [{ stencil: 'nope.nothing' }] })).toThrow(/Unknown stencil/)
  })

  it('loads a document with no history and clamps the zoom', () => {
    const e = make()
    e.addShape({ stencil: 'basic.rectangle' })
    e.load({ ...e.doc, title: 'Loaded' }, 'C:\\Users\\Agent\\Documents\\x.xpdiagram')
    expect(e.undoLabel).toBeNull()
    expect(e.dirty).toBe(false)
    expect(e.path).toMatch(/x\.xpdiagram$/)
    e.setZoom(99)
    expect(e.zoom).toBe(4)
    e.zoomBy(-1)
    expect(e.zoom).toBe(3)
  })
})
