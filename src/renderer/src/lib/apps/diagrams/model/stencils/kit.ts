/** Small builders the stencil files share. */
import { el, n, type SvgNode } from '../svg'
import type { BodyContext, PortDef } from './types'

export const sidePorts = (w: number, h: number): PortDef[] => [
  { id: 'n', x: w / 2, y: 0, dir: 'n' },
  { id: 'e', x: w, y: h / 2, dir: 'e' },
  { id: 's', x: w / 2, y: h, dir: 's' },
  { id: 'w', x: 0, y: h / 2, dir: 'w' }
]

/** Side midpoints plus the quarter points of each side (for wide shapes, swimlanes and bars). */
export const manyPorts = (w: number, h: number): PortDef[] => [
  ...sidePorts(w, h),
  { id: 'n1', x: w / 4, y: 0, dir: 'n' },
  { id: 'n3', x: (w * 3) / 4, y: 0, dir: 'n' },
  { id: 's1', x: w / 4, y: h, dir: 's' },
  { id: 's3', x: (w * 3) / 4, y: h, dir: 's' },
  { id: 'e1', x: w, y: h / 4, dir: 'e' },
  { id: 'e3', x: w, y: (h * 3) / 4, dir: 'e' },
  { id: 'w1', x: 0, y: h / 4, dir: 'w' },
  { id: 'w3', x: 0, y: (h * 3) / 4, dir: 'w' }
]

export const paint = (ctx: BodyContext, extra: Record<string, string | number | undefined> = {}): Record<string, string | number | undefined> => ({ fill: ctx.fill, ...ctx.line, ...extra })

export const pathEl = (ctx: BodyContext, d: string, extra: Record<string, string | number | undefined> = {}): SvgNode => el('path', { d, ...paint(ctx, extra) })

/** A closed polygon from [x, y] pairs. */
export const polyEl = (ctx: BodyContext, points: readonly (readonly [number, number])[], extra: Record<string, string | number | undefined> = {}): SvgNode =>
  pathEl(ctx, points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${n(x)} ${n(y)}`).join(' ') + ' Z', extra)

export const rectEl = (ctx: BodyContext, x: number, y: number, w: number, h: number, rx = 0, extra: Record<string, string | number | undefined> = {}): SvgNode =>
  el('rect', { x, y, width: Math.max(0, w), height: Math.max(0, h), rx: rx || undefined, ry: rx || undefined, ...paint(ctx, extra) })

export const ellipseEl = (ctx: BodyContext, cx: number, cy: number, rx: number, ry: number, extra: Record<string, string | number | undefined> = {}): SvgNode =>
  el('ellipse', { cx, cy, rx: Math.max(0, rx), ry: Math.max(0, ry), ...paint(ctx, extra) })

/** A line drawn with the shape's stroke and no fill. */
export const strokeEl = (ctx: BodyContext, d: string, extra: Record<string, string | number | undefined> = {}): SvgNode => el('path', { d, ...ctx.line, fill: 'none', ...extra })

export const regularPolygon = (w: number, h: number, sides: number, rotation = -90): [number, number][] =>
  Array.from({ length: sides }, (_, i) => {
    const a = ((rotation + (360 / sides) * i) * Math.PI) / 180
    return [w / 2 + (w / 2) * Math.cos(a), h / 2 + (h / 2) * Math.sin(a)] as [number, number]
  })

export const star = (w: number, h: number, points = 5, inner = 0.42): [number, number][] =>
  Array.from({ length: points * 2 }, (_, i) => {
    const a = ((-90 + (180 / points) * i) * Math.PI) / 180
    const r = i % 2 === 0 ? 1 : inner
    return [w / 2 + (w / 2) * r * Math.cos(a), h / 2 + (h / 2) * r * Math.sin(a)] as [number, number]
  })

/** A wavy bottom edge (documents, punched tape) from (x0, y) to (x1, y), amplitude a. */
export const wave = (x0: number, x1: number, y: number, a: number): string => {
  const w = x1 - x0
  return `C${n(x0 + w * 0.75)} ${n(y + a * 2)} ${n(x0 + w * 0.25)} ${n(y - a * 2)} ${n(x0)} ${n(y)}`
}

export const textInset = (w: number, h: number, pad = 6): { x: number; y: number; w: number; h: number } => ({ x: pad, y: pad, w: Math.max(4, w - pad * 2), h: Math.max(4, h - pad * 2) })

/** Strings of an unknown value (stencil data lists). */
export const stringList = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : typeof value === 'string' && value ? value.split('\n') : [])
