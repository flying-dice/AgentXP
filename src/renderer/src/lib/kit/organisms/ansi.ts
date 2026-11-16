/** ANSI SGR parser: 16 colours, bright variants, bold, dim, underline, inverse. Other escapes are dropped. */

export interface AnsiSpan {
  text: string
  fg?: string
  bg?: string
  bold?: boolean
  dim?: boolean
  underline?: boolean
}

/** Windows 10 console (Campbell) palette, index 0-7 normal, 8-15 bright. */
export const ANSI_PALETTE = [
  '#0c0c0c', '#c50f1f', '#13a10e', '#c19c00', '#0037da', '#881798', '#3a96dd', '#cccccc',
  '#767676', '#e74856', '#16c60c', '#f9f1a5', '#3b78ff', '#b4009e', '#61d6d6', '#f2f2f2'
] as const

interface Style {
  fg?: number
  bg?: number
  bold: boolean
  dim: boolean
  underline: boolean
  inverse: boolean
}

const fresh = (): Style => ({ bold: false, dim: false, underline: false, inverse: false })

const applyCodes = (style: Style, codes: number[]): Style => {
  const next = { ...style }
  const list = codes.length === 0 ? [0] : codes
  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    if (c === 0) Object.assign(next, fresh(), { fg: undefined, bg: undefined })
    else if (c === 1) next.bold = true
    else if (c === 2) next.dim = true
    else if (c === 4) next.underline = true
    else if (c === 7) next.inverse = true
    else if (c === 22) next.bold = next.dim = false
    else if (c === 24) next.underline = false
    else if (c === 27) next.inverse = false
    else if (c >= 30 && c <= 37) next.fg = c - 30
    else if (c === 39) next.fg = undefined
    else if (c >= 40 && c <= 47) next.bg = c - 40
    else if (c === 49) next.bg = undefined
    else if (c >= 90 && c <= 97) next.fg = c - 90 + 8
    else if (c >= 100 && c <= 107) next.bg = c - 100 + 8
    else if (c === 38 || c === 48) {
      // Extended colours: 5;n (256) or 2;r;g;b. Only the first 16 map to the palette; skip the rest.
      const mode = list[i + 1]
      if (mode === 5) {
        const n = list[i + 2]
        if (n !== undefined && n < 16) next[c === 38 ? 'fg' : 'bg'] = n
        i += 2
      } else if (mode === 2) i += 4
    }
  }
  return next
}

const toSpan = (text: string, style: Style): AnsiSpan => {
  // Bold on a normal colour brightens it, like the Windows console.
  const bright = (index: number | undefined): number | undefined =>
    index !== undefined && index < 8 && style.bold ? index + 8 : index
  let fg = bright(style.fg)
  let bg = style.bg
  if (style.inverse) [fg, bg] = [bg ?? 0, fg ?? 7]
  const span: AnsiSpan = { text }
  if (fg !== undefined) span.fg = ANSI_PALETTE[fg]
  if (bg !== undefined) span.bg = ANSI_PALETTE[bg]
  if (style.bold) span.bold = true
  if (style.dim) span.dim = true
  if (style.underline) span.underline = true
  return span
}

// eslint-disable-next-line no-control-regex
const ESCAPE = /\u001b(?:\[([0-9;:?]*)([\x20-\x2f]*[\x40-\x7e])|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_])/g

/** Splits `text` into styled spans. Adjacent spans with identical style are merged. */
export const parseAnsi = (text: string): AnsiSpan[] => {
  const spans: AnsiSpan[] = []
  let style = fresh()
  let last = 0
  const push = (chunk: string): void => {
    if (!chunk) return
    const span = toSpan(chunk, style)
    const prev = spans[spans.length - 1]
    if (
      prev &&
      prev.fg === span.fg &&
      prev.bg === span.bg &&
      prev.bold === span.bold &&
      prev.dim === span.dim &&
      prev.underline === span.underline
    )
      prev.text += chunk
    else spans.push(span)
  }
  for (const match of text.matchAll(ESCAPE)) {
    push(text.slice(last, match.index))
    last = match.index + match[0].length
    if (match[2] === 'm') {
      const codes = (match[1] ?? '').split(/[;:]/).map((s) => (s === '' ? 0 : Number(s)))
      style = applyCodes(style, codes.every(Number.isFinite) ? codes : [])
    }
  }
  push(text.slice(last))
  return spans
}
