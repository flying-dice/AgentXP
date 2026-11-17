/**
 * A tiny SVG node tree. Stencils describe their bodies with it; the canvas renders it with Svelte and the
 * export turns it into markup, so the screen and the exported file always agree.
 */

export type SvgTag = 'g' | 'path' | 'rect' | 'ellipse' | 'circle' | 'line' | 'polyline' | 'polygon' | 'text' | 'tspan' | 'linearGradient' | 'stop'

export interface SvgNode {
  tag: SvgTag
  attrs: Record<string, string | number>
  children?: SvgNode[]
  /** Text content of `text` and `tspan`. */
  text?: string
}

export const el = (tag: SvgTag, attrs: Record<string, string | number | undefined | false>, children?: SvgNode[], text?: string): SvgNode => {
  const clean: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== false) clean[k] = v
  return { tag, attrs: clean, ...(children && children.length ? { children } : {}), ...(text !== undefined ? { text } : {}) }
}

export const escapeXml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Rounds a coordinate for markup: two decimals, no trailing zeros. */
export const n = (v: number): string => String(Math.round(v * 100) / 100)

export function toMarkup(node: SvgNode, indent = ''): string {
  const attrs = Object.entries(node.attrs)
    .map(([k, v]) => ` ${k}="${escapeXml(typeof v === 'number' ? n(v) : v)}"`)
    .join('')
  if (node.text !== undefined && !node.children) return `${indent}<${node.tag}${attrs}>${escapeXml(node.text)}</${node.tag}>`
  if (!node.children || node.children.length === 0) return `${indent}<${node.tag}${attrs}/>`
  if (node.tag === 'text') return `${indent}<text${attrs}>${node.children.map((c) => toMarkup(c, '')).join('')}</text>`
  return `${indent}<${node.tag}${attrs}>\n${node.children.map((c) => toMarkup(c, indent + '  ')).join('\n')}\n${indent}</${node.tag}>`
}

/** Path data helpers. */
export const pathOf = (points: readonly { x: number; y: number }[], close = false): string =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'}${n(p.x)} ${n(p.y)}`).join(' ') + (close ? ' Z' : '')
