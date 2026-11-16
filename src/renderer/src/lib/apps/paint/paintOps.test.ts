import { describe, expect, it } from 'vitest'
import { boxOf, floodFill, normalizeColor, opAnchor, parseColor, parseDrawParams, parseResizeParams, PALETTE } from './paintOps'

describe('colours', () => {
  it('normalises hex and names', () => {
    expect(normalizeColor('#F80')).toBe('#ff8800')
    expect(normalizeColor('Red')).toBe('#ed1c24')
    expect(normalizeColor('#12345')).toBeNull()
    expect(normalizeColor(5)).toBeNull()
    expect(parseColor('#0000ff')).toEqual([0, 0, 255, 255])
  })
  it('has a 2 x 10 palette of valid colours', () => {
    expect(PALETTE).toHaveLength(20)
    expect(PALETTE.every((c) => normalizeColor(c) === c)).toBe(true)
  })
})

describe('parseDrawParams', () => {
  it('accepts every op kind', () => {
    const ops = parseDrawParams({
      ops: [
        { op: 'line', x1: 0, y1: 0, x2: 10, y2: 10, color: 'red', width: 3 },
        { op: 'rect', x: 1, y: 2, w: 3, h: 4, fill: '#fff' },
        { op: 'ellipse', x: 1, y: 2, w: 3, h: 4 },
        { op: 'path', points: [[0, 0], [5, 5], [9, 1]], closed: true },
        { op: 'fill', x: 3, y: 3, color: '#00ff00' },
        { op: 'text', x: 1, y: 1, text: 'hi', size: 20 },
        { op: 'clear' }
      ]
    })
    expect(ops.map((o) => o.op)).toEqual(['line', 'rect', 'ellipse', 'path', 'fill', 'text', 'clear'])
    expect(ops[1]).toMatchObject({ fill: '#ffffff' })
  })
  it('rejects bad input with the op index', () => {
    expect(() => parseDrawParams(null)).toThrow('params.ops')
    expect(() => parseDrawParams({ ops: [] })).toThrow('empty')
    expect(() => parseDrawParams({ ops: [{ op: 'line', x1: 0, y1: 0, x2: NaN, y2: 1 }] })).toThrow('ops[0]: "x2"')
    expect(() => parseDrawParams({ ops: [{ op: 'clear' }, { op: 'blob' }] })).toThrow('ops[1]: unknown op')
    expect(() => parseDrawParams({ ops: [{ op: 'fill', x: 1, y: 1 }] })).toThrow('"color" is required')
    expect(() => parseDrawParams({ ops: [{ op: 'line', x1: 0, y1: 0, x2: 1, y2: 1, color: 'url(x)' }] })).toThrow('hex colour')
    expect(() => parseDrawParams({ ops: [{ op: 'line', x1: 0, y1: 0, x2: 1, y2: 1, width: 999 }] })).toThrow('width')
    expect(() => parseDrawParams({ ops: [{ op: 'path', points: [[0, 0]] }] })).toThrow('at least 2')
    expect(() => parseDrawParams({ ops: Array.from({ length: 501 }, () => ({ op: 'clear' })) })).toThrow('At most')
  })
})

describe('parseDrawParams tool format', () => {
  it('accepts type, {x, y} points, polyline lines, fill true and css fonts', () => {
    const ops = parseDrawParams({
      ops: [
        { type: 'line', points: [{ x: 0, y: 0 }, { x: 5, y: 5 }], color: 'rgb(255, 0, 0)' },
        { type: 'rect', x: 1, y: 1, w: 4, h: 4, color: '#00f', fill: true },
        { type: 'text', x: 2, y: 2, text: 'hi', font: '24px sans-serif' },
        { type: 'clear', color: '#fff' }
      ]
    })
    expect(ops[0]).toMatchObject({ op: 'path', color: '#ff0000', points: [[0, 0], [5, 5]] })
    expect(ops[1]).toMatchObject({ op: 'rect', fill: '#0000ff' })
    expect(ops[2]).toMatchObject({ op: 'text', size: 24, font: '24px sans-serif' })
    expect(ops[3]).toMatchObject({ op: 'clear', color: '#ffffff' })
  })
})

describe('parseResizeParams', () => {
  it('validates the size', () => {
    expect(parseResizeParams({ width: 300.4, height: 200 })).toEqual({ width: 300, height: 200 })
    expect(() => parseResizeParams({ width: 5, height: 200 })).toThrow('between')
    expect(() => parseResizeParams({ width: 'a', height: 200 })).toThrow('numbers')
  })
})

describe('opAnchor and boxOf', () => {
  it('finds where the ghost goes', () => {
    expect(opAnchor({ op: 'line', x1: 0, y1: 0, x2: 4, y2: 5 })).toEqual([4, 5])
    expect(opAnchor({ op: 'rect', x: 1, y: 1, w: 2, h: 3 })).toEqual([3, 4])
    expect(opAnchor({ op: 'clear' })).toBeNull()
  })
  it('normalises a drag', () => {
    expect(boxOf(10, 10, 4, 2)).toEqual({ x: 4, y: 2, w: 6, h: 8 })
  })
})

describe('floodFill', () => {
  const make = (w: number, h: number, rows?: string[]): Uint8ClampedArray => {
    const d = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < w * h; i++) {
      const wall = rows ? rows[Math.floor(i / w)][i % w] === '#' : false
      d.set(wall ? [0, 0, 0, 255] : [255, 255, 255, 255], i * 4)
    }
    return d
  }
  it('fills a whole blank canvas', () => {
    const d = make(4, 3)
    expect(floodFill(d, 4, 3, 1, 1, [255, 0, 0, 255])).toBe(12)
    expect(d[0]).toBe(255)
    expect(d[1]).toBe(0)
  })
  it('stops at walls', () => {
    const d = make(5, 3, ['..#..', '..#..', '..#..'])
    expect(floodFill(d, 5, 3, 0, 0, [0, 255, 0, 255])).toBe(6)
    expect(d[(0 * 5 + 3) * 4 + 1]).toBe(255) // right side untouched (still white)
    expect(d[(0 * 5 + 3) * 4]).toBe(255)
    expect(d[(0 * 5 + 0) * 4]).toBe(0)
  })
  it('does nothing for the same colour or outside', () => {
    const d = make(3, 3)
    expect(floodFill(d, 3, 3, 1, 1, [255, 255, 255, 255])).toBe(0)
    expect(floodFill(d, 3, 3, 9, 1, [1, 2, 3, 255])).toBe(0)
  })
  it('fills diagonal gaps only 4-connected', () => {
    const d = make(3, 3, ['.#.', '#..', '...'])
    expect(floodFill(d, 3, 3, 0, 0, [9, 9, 9, 255])).toBe(1)
  })
})
