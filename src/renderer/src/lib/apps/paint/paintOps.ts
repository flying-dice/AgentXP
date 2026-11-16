/**
 * Pure logic of Agent Paint: the drawing ops the agent sends (validated), colour parsing, the
 * palette and a flood fill over raw RGBA data. No DOM here, so it is unit tested.
 */

export type Rgba = [number, number, number, number]

export const MIN_CANVAS = 16
export const MAX_CANVAS = 4096
export const MAX_OPS = 500
export const MAX_POINTS = 2000
export const MAX_TEXT = 500
export const MAX_STROKE = 200

const NAMED: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ed1c24',
  green: '#22b14c',
  blue: '#3f48cc',
  yellow: '#fff200',
  orange: '#ff7f27',
  purple: '#a349a4',
  pink: '#ffaec9',
  brown: '#b97a57',
  gray: '#7f7f7f',
  grey: '#7f7f7f',
  cyan: '#00a2e8',
  magenta: '#ff00ff'
}

/** The 2 x 10 palette of Paint, top row dark, bottom row light. */
export const PALETTE: readonly string[] = [
  '#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4',
  '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7'
]

/** Normalises a colour to `#rrggbb`; null when it is not a hex colour or a known colour name. */
export function normalizeColor(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim().toLowerCase()
  if (text in NAMED) return NAMED[text]
  const rgb = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/.exec(text)
  if (rgb) return toHex(...([rgb[1], rgb[2], rgb[3]].map((n) => Math.min(255, Number(n))) as [number, number, number]))
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(text)
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`
  return /^#[0-9a-f]{6}$/.test(text) ? text : null
}

export function parseColor(value: string): Rgba | null {
  const hex = normalizeColor(value)
  if (!hex) return null
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255]
}

export const toHex = (r: number, g: number, b: number): string => `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`

export const clampSize = (n: number): number => Math.max(MIN_CANVAS, Math.min(MAX_CANVAS, Math.round(n)))

export type PaintOp =
  | { op: 'line'; x1: number; y1: number; x2: number; y2: number; color?: string; width?: number }
  | { op: 'rect'; x: number; y: number; w: number; h: number; color?: string; width?: number; fill?: string }
  | { op: 'ellipse'; x: number; y: number; w: number; h: number; color?: string; width?: number; fill?: string }
  | { op: 'path'; points: [number, number][]; color?: string; width?: number; closed?: boolean; fill?: string }
  | { op: 'fill'; x: number; y: number; color: string }
  | { op: 'text'; x: number; y: number; text: string; color?: string; size?: number; font?: string }
  | { op: 'clear'; color?: string }

const fail = (index: number, message: string): never => {
  throw new Error(`ops[${index}]: ${message}`)
}

function num(o: Record<string, unknown>, key: string, index: number): number {
  const v = o[key]
  if (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > 100000) return fail(index, `"${key}" must be a finite number`)
  return v
}

function color(o: Record<string, unknown>, key: string, index: number, required = false): string | undefined {
  const v = o[key]
  if (v === undefined || v === null) return required ? fail(index, `"${key}" is required (hex like #ff8800 or a name like red)`) : undefined
  return normalizeColor(v) ?? fail(index, `"${key}" must be a hex colour like #ff8800 rgb(r, g, b) or one of: ${Object.keys(NAMED).join(', ')}`)
}

function width(o: Record<string, unknown>, index: number): number | undefined {
  if (o.width === undefined) return undefined
  const w = num(o, 'width', index)
  return w < 1 || w > MAX_STROKE ? fail(index, `"width" must be between 1 and ${MAX_STROKE}`) : w
}

const isPoint = (p: unknown): boolean => p !== null && typeof p === 'object' && !Array.isArray(p) && 'x' in p && 'y' in p

/**
 * Accepts the shapes the MCP tool sends (`type` instead of `op`, `points` as `{x, y}`, `line` as a
 * polyline, `fill: true`, a CSS `font`) next to the compact internal form.
 */
function normalizeRaw(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const o = { ...(raw as Record<string, unknown>) }
  if (o.op === undefined && o.type !== undefined) o.op = o.type
  if (Array.isArray(o.points)) o.points = o.points.map((p) => (isPoint(p) ? [(p as { x: number }).x, (p as { y: number }).y] : p))
  if (o.op === 'line' && Array.isArray(o.points) && o.x1 === undefined) o.op = 'path'
  if (o.fill === true) o.fill = o.color ?? '#000000'
  else if (o.fill === false) delete o.fill
  if (o.op === 'text' && typeof o.font === 'string' && o.size === undefined) {
    const m = /(\d+(?:\.\d+)?)px/.exec(o.font)
    if (m) o.size = Math.min(200, Math.max(6, Number(m[1])))
  }
  return o
}

/** Validates the params of a `draw` request. Throws an Error that names the offending op. */
export function parseDrawParams(params: unknown): PaintOp[] {
  const ops = params && typeof params === 'object' ? (params as { ops?: unknown }).ops : undefined
  if (!Array.isArray(ops)) throw new Error('params.ops must be an array of drawing ops')
  if (ops.length === 0) throw new Error('params.ops is empty')
  if (ops.length > MAX_OPS) throw new Error(`At most ${MAX_OPS} ops per call`)
  return ops.map((raw0, i): PaintOp => {
    const raw = normalizeRaw(raw0)
    if (!raw || typeof raw !== 'object') return fail(i, 'must be an object')
    const o = raw as Record<string, unknown>
    switch (o.op) {
      case 'line':
        return { op: 'line', x1: num(o, 'x1', i), y1: num(o, 'y1', i), x2: num(o, 'x2', i), y2: num(o, 'y2', i), color: color(o, 'color', i), width: width(o, i) }
      case 'rect':
      case 'ellipse':
        return { op: o.op, x: num(o, 'x', i), y: num(o, 'y', i), w: num(o, 'w', i), h: num(o, 'h', i), color: color(o, 'color', i), width: width(o, i), fill: color(o, 'fill', i) }
      case 'path': {
        const pts = o.points
        if (!Array.isArray(pts) || pts.length < 2) return fail(i, '"points" needs at least 2 [x, y] pairs')
        if (pts.length > MAX_POINTS) return fail(i, `"points" has more than ${MAX_POINTS} points`)
        const points = pts.map((p, k): [number, number] => {
          if (!Array.isArray(p) || p.length !== 2 || !p.every((n) => typeof n === 'number' && Number.isFinite(n))) return fail(i, `points[${k}] must be [x, y]`)
          return [p[0] as number, p[1] as number]
        })
        return { op: 'path', points, color: color(o, 'color', i), width: width(o, i), closed: o.closed === true, fill: color(o, 'fill', i) }
      }
      case 'fill':
        return { op: 'fill', x: num(o, 'x', i), y: num(o, 'y', i), color: color(o, 'color', i, true)! }
      case 'text': {
        if (typeof o.text !== 'string' || o.text.length === 0) return fail(i, '"text" must be a non-empty string')
        if (o.text.length > MAX_TEXT) return fail(i, `"text" is longer than ${MAX_TEXT} characters`)
        const size = o.size === undefined ? undefined : num(o, 'size', i)
        if (size !== undefined && (size < 6 || size > 200)) return fail(i, '"size" must be between 6 and 200')
        const font = typeof o.font === 'string' && /^[\w\s.,"'-]{1,80}$/.test(o.font) && /\d+px/.test(o.font) ? o.font : undefined
        return { op: 'text', x: num(o, 'x', i), y: num(o, 'y', i), text: o.text, color: color(o, 'color', i), size, font }
      }
      case 'clear':
        return { op: 'clear', color: color(o, 'color', i) }
      default:
        return fail(i, `unknown op ${JSON.stringify(o.op)}. Use line, rect, ellipse, path, fill, text or clear`)
    }
  })
}

/** Validates the params of a `resize` request. */
export function parseResizeParams(params: unknown): { width: number; height: number } {
  const p = (params ?? {}) as { width?: unknown; height?: unknown }
  if (typeof p.width !== 'number' || typeof p.height !== 'number' || !Number.isFinite(p.width) || !Number.isFinite(p.height)) throw new Error('params.width and params.height must be numbers')
  if (p.width < MIN_CANVAS || p.height < MIN_CANVAS || p.width > MAX_CANVAS || p.height > MAX_CANVAS) throw new Error(`Canvas size must be between ${MIN_CANVAS} and ${MAX_CANVAS} pixels`)
  return { width: Math.round(p.width), height: Math.round(p.height) }
}

/** Where an op "points": the pointer ghost of the agent goes here. */
export function opAnchor(op: PaintOp): [number, number] | null {
  switch (op.op) {
    case 'line':
      return [op.x2, op.y2]
    case 'rect':
    case 'ellipse':
      return [op.x + op.w, op.y + op.h]
    case 'path': {
      const last = op.points.at(-1)
      return last ? [last[0], last[1]] : null
    }
    case 'fill':
    case 'text':
      return [op.x, op.y]
    case 'clear':
      return null
  }
}

/**
 * Scanline-free 4-way flood fill on RGBA data. Fills the region around (x, y) that has exactly the
 * colour found there, with `rgba`. Returns the number of pixels changed (0 when the target already
 * has that colour or the point is outside).
 */
export function floodFill(data: Uint8ClampedArray, width: number, height: number, x: number, y: number, rgba: Rgba): number {
  x = Math.floor(x)
  y = Math.floor(y)
  if (x < 0 || y < 0 || x >= width || y >= height) return 0
  const at = (px: number, py: number): number => (py * width + px) * 4
  const start = at(x, y)
  const target: Rgba = [data[start], data[start + 1], data[start + 2], data[start + 3]]
  if (target.every((v, i) => v === rgba[i])) return 0
  const same = (i: number): boolean => data[i] === target[0] && data[i + 1] === target[1] && data[i + 2] === target[2] && data[i + 3] === target[3]
  const stack: number[] = [x, y]
  let count = 0
  while (stack.length > 0) {
    const cy = stack.pop()!
    let cx = stack.pop()!
    // Walk to the left edge of the span.
    while (cx > 0 && same(at(cx - 1, cy))) cx--
    let up = false
    let down = false
    while (cx < width && same(at(cx, cy))) {
      const i = at(cx, cy)
      data[i] = rgba[0]
      data[i + 1] = rgba[1]
      data[i + 2] = rgba[2]
      data[i + 3] = rgba[3]
      count++
      if (cy > 0) {
        const s = same(at(cx, cy - 1))
        if (s && !up) stack.push(cx, cy - 1)
        up = s
      }
      if (cy < height - 1) {
        const s = same(at(cx, cy + 1))
        if (s && !down) stack.push(cx, cy + 1)
        down = s
      }
      cx++
    }
  }
  return count
}

/** Normalises two drag corners to a box with positive size. */
export function boxOf(x1: number, y1: number, x2: number, y2: number): { x: number; y: number; w: number; h: number } {
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
}

export const STROKE_SIZES = [1, 2, 4, 8] as const
