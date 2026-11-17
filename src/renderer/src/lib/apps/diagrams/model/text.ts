/** Text measuring and wrapping. The canvas measures with a real font; tests and fallbacks estimate. */
import { el, type SvgNode } from './svg'
import type { Rect, ShapeStyle } from './types'

export interface FontSpec {
  family: string
  size: number
  bold?: boolean
  italic?: boolean
}

export type Measure = (text: string, font: FontSpec) => number

/** An estimate good enough for layout without a DOM: 0.55 em per character (0.6 bold). */
export const estimateMeasure: Measure = (text, font) => text.length * font.size * (font.bold ? 0.6 : 0.55)

/** A measure backed by a 2D canvas context (renderer only). */
export function canvasMeasure(): Measure {
  const cache = new Map<string, number>()
  let ctx: CanvasRenderingContext2D | null = null
  return (text, font) => {
    const key = `${font.family}|${font.size}|${font.bold ? 1 : 0}|${font.italic ? 1 : 0}|${text}`
    const hit = cache.get(key)
    if (hit !== undefined) return hit
    if (!ctx) ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
    if (!ctx) return estimateMeasure(text, font)
    ctx.font = cssFont(font)
    const width = ctx.measureText(text).width
    if (cache.size > 5000) cache.clear()
    cache.set(key, width)
    return width
  }
}

export const cssFont = (font: FontSpec): string => `${font.italic ? 'italic ' : ''}${font.bold ? 'bold ' : ''}${font.size}px "${font.family}", "Segoe UI", sans-serif`

export const fontOf = (style: Pick<ShapeStyle, 'fontFamily' | 'fontSize' | 'bold' | 'italic'>): FontSpec => ({ family: style.fontFamily, size: style.fontSize, bold: style.bold, italic: style.italic })

/** Breaks text into lines that fit `width` (explicit newlines kept; long words are split by character). */
export function wrapText(text: string, width: number, font: FontSpec, measure: Measure): string[] {
  const out: string[] = []
  const max = Math.max(1, width)
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      out.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (measure(candidate, font) <= max) {
        line = candidate
        continue
      }
      if (line) out.push(line)
      if (measure(word, font) <= max) {
        line = word
        continue
      }
      // A word longer than the line: split it.
      let chunk = ''
      for (const ch of word) {
        if (measure(chunk + ch, font) > max && chunk) {
          out.push(chunk)
          chunk = ch
        } else chunk += ch
      }
      line = chunk
    }
    out.push(line)
  }
  return out
}

export const lineHeight = (size: number): number => Math.round(size * 1.25 * 100) / 100

/** Text laid out in a box, as an SVG `text` node with one `tspan` per line. */
export function textBlock(
  text: string,
  box: Rect,
  style: Pick<ShapeStyle, 'fontFamily' | 'fontSize' | 'fontColor' | 'bold' | 'italic' | 'underline' | 'textAlign' | 'verticalAlign'>,
  measure: Measure,
  extra: Record<string, string | number> = {}
): SvgNode | null {
  if (!text) return null
  const font = fontOf(style)
  const lines = wrapText(text, box.w, font, measure)
  const lh = lineHeight(style.fontSize)
  const total = lines.length * lh
  const top = style.verticalAlign === 'top' ? box.y : style.verticalAlign === 'bottom' ? box.y + box.h - total : box.y + (box.h - total) / 2
  const x = style.textAlign === 'left' ? box.x : style.textAlign === 'right' ? box.x + box.w : box.x + box.w / 2
  const anchor = style.textAlign === 'left' ? 'start' : style.textAlign === 'right' ? 'end' : 'middle'
  // The first baseline sits about 0.8 em below the top of its line box.
  const baseline = top + (lh - style.fontSize) / 2 + style.fontSize * 0.8
  return el(
    'text',
    {
      x,
      y: baseline,
      'text-anchor': anchor,
      'font-family': `${style.fontFamily}, Segoe UI, sans-serif`,
      'font-size': style.fontSize,
      'font-weight': style.bold ? 'bold' : undefined,
      'font-style': style.italic ? 'italic' : undefined,
      'text-decoration': style.underline ? 'underline' : undefined,
      fill: style.fontColor,
      ...extra
    },
    lines.map((line, i) => el('tspan', { x, dy: i === 0 ? 0 : lh }, undefined, line || ' '))
  )
}

/** A single line of text (no wrapping). */
export function textLine(text: string, x: number, y: number, font: FontSpec, fill: string, anchor: 'start' | 'middle' | 'end' = 'start', extra: Record<string, string | number | undefined> = {}): SvgNode {
  return el(
    'text',
    {
      x,
      y,
      'text-anchor': anchor,
      'font-family': `${font.family}, Segoe UI, sans-serif`,
      'font-size': font.size,
      'font-weight': font.bold ? 'bold' : undefined,
      'font-style': font.italic ? 'italic' : undefined,
      fill,
      ...extra
    },
    undefined,
    text
  )
}
