/** The default look (the theme) and how a shape's or a connector's own style is merged over it. */
import type { ConnectorStyle, DashStyle, ShapeStyle } from './types'

export const FONT_FAMILIES = ['Segoe UI', 'Calibri', 'Arial', 'Tahoma', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New', 'Consolas'] as const

export const THEME_SHAPE: ShapeStyle = {
  fill: '#dbe8f8',
  gradient: true,
  stroke: '#3a6aa5',
  strokeWidth: 1.25,
  dash: 'solid',
  opacity: 1,
  shadow: false,
  fontFamily: 'Segoe UI',
  fontSize: 12,
  fontColor: '#1a2a40',
  bold: false,
  italic: false,
  underline: false,
  textAlign: 'center',
  verticalAlign: 'middle'
}

export const THEME_CONNECTOR: ConnectorStyle = {
  stroke: '#3a5070',
  strokeWidth: 1.25,
  dash: 'solid',
  startMarker: 'none',
  endMarker: 'arrow',
  fontFamily: 'Segoe UI',
  fontSize: 11,
  fontColor: '#1a2a40',
  rounded: false
}

/** The header band of UML classes and ERD entities. */
export const THEME_ACCENT = '#4a78b5'
export const THEME_ACCENT_TEXT = '#ffffff'

/** The color swatches of the fill, line and font pickers (Office 2010 standard colors and theme tints). */
export const DIAGRAM_PALETTE = [
  '#ffffff', '#000000', '#eeece1', '#1f497d', '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646',
  '#f2f2f2', '#7f7f7f', '#ddd9c3', '#c6d9f0', '#dbe5f1', '#f2dcdb', '#ebf1dd', '#e5e0ec', '#dbeef3', '#fdeada',
  '#d8d8d8', '#595959', '#c4bd97', '#8db3e2', '#b8cce4', '#e5b9b7', '#d7e3bc', '#ccc1d9', '#b7dde8', '#fbd5b5',
  '#bfbfbf', '#3f3f3f', '#938953', '#548dd4', '#95b3d7', '#d99694', '#c3d69b', '#b2a2c7', '#92cddc', '#fac08f',
  '#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0'
] as const

export function resolveShapeStyle(stencil: Partial<ShapeStyle> | undefined, own: Partial<ShapeStyle> | undefined): ShapeStyle {
  return { ...THEME_SHAPE, ...stencil, ...own }
}

export function resolveConnectorStyle(preset: Partial<ConnectorStyle> | undefined, own: Partial<ConnectorStyle> | undefined): ConnectorStyle {
  return { ...THEME_CONNECTOR, ...preset, ...own }
}

export function dashArray(dash: DashStyle, width: number): string | undefined {
  const w = Math.max(1, width)
  switch (dash) {
    case 'dashed':
      return `${w * 5} ${w * 3}`
    case 'dotted':
      return `${w} ${w * 2}`
    case 'dash-dot':
      return `${w * 6} ${w * 2.5} ${w} ${w * 2.5}`
    default:
      return undefined
  }
}

const NAMED: Record<string, string> = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff', yellow: '#ffff00', orange: '#ffa500',
  purple: '#800080', gray: '#808080', grey: '#808080', navy: '#000080', teal: '#008080', silver: '#c0c0c0', maroon: '#800000',
  olive: '#808000', lime: '#00ff00', aqua: '#00ffff', cyan: '#00ffff', fuchsia: '#ff00ff', magenta: '#ff00ff', pink: '#ffc0cb',
  brown: '#a52a2a', gold: '#ffd700', lightblue: '#add8e6', lightgreen: '#90ee90', lightgray: '#d3d3d3', lightgrey: '#d3d3d3',
  darkblue: '#00008b', darkgreen: '#006400', darkgray: '#a9a9a9', darkgrey: '#a9a9a9', transparent: 'none', none: 'none'
}

/** A CSS color the diagram accepts: #rgb, #rrggbb, rgb(...), a common name, or none. Returns the normalized value or null. */
export function normalizeColor(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  if (NAMED[v]) return NAMED[v]
  if (/^#[0-9a-f]{6}$/.test(v)) return v
  if (/^#[0-9a-f]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/.exec(v)
  if (rgb) {
    const parts = rgb.slice(1, 4).map((p) => Math.min(255, Number(p)))
    return `#${parts.map((p) => p.toString(16).padStart(2, '0')).join('')}`
  }
  return null
}

/** Mixes a #rrggbb color with white (amount > 0) or black (amount < 0). */
export function tint(color: string, amount: number): string {
  const c = normalizeColor(color)
  if (!c || c === 'none') return color
  const parts = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const mixed = parts.map((p) => Math.round(amount >= 0 ? p + (255 - p) * amount : p * (1 + amount)))
  return `#${mixed.map((p) => Math.max(0, Math.min(255, p)).toString(16).padStart(2, '0')).join('')}`
}

/** Relative luminance 0..1, to pick a readable text color on a fill. */
export function luminance(color: string): number {
  const c = normalizeColor(color)
  if (!c || c === 'none') return 1
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
