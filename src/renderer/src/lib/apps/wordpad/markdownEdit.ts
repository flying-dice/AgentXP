/** Pure markdown editing helpers of WordPad: each takes the text and selection and returns both anew. */

export interface Edit {
  text: string
  start: number
  end: number
}

const lineStart = (text: string, at: number): number => text.lastIndexOf('\n', at - 1) + 1
const lineEnd = (text: string, at: number): number => {
  const i = text.indexOf('\n', at)
  return i < 0 ? text.length : i
}

/** Wraps the selection (or a placeholder) in `before`/`after`; wrapping already wrapped text unwraps it. */
export function wrapSelection(text: string, start: number, end: number, before: string, after = before, placeholder = 'text'): Edit {
  const selected = text.slice(start, end)
  if (selected.length >= before.length + after.length && selected.startsWith(before) && selected.endsWith(after)) {
    const inner = selected.slice(before.length, selected.length - after.length)
    return { text: text.slice(0, start) + inner + text.slice(end), start, end: start + inner.length }
  }
  if (text.slice(start - before.length, start) === before && text.slice(end, end + after.length) === after && selected) {
    return { text: text.slice(0, start - before.length) + selected + text.slice(end + after.length), start: start - before.length, end: end - before.length }
  }
  const body = selected || placeholder
  const next = text.slice(0, start) + before + body + after + text.slice(end)
  return { text: next, start: start + before.length, end: start + before.length + body.length }
}

const HEADING = /^#{1,6} /
const BULLET = /^\s*[-*+] /
const NUMBERED = /^\s*\d+\. /

/** Sets or toggles a heading level on every selected line (level 0 removes it). */
export function toggleHeading(text: string, start: number, end: number, level: 1 | 2 | 3): Edit {
  const prefix = `${'#'.repeat(level)} `
  return mapLines(text, start, end, (line) => {
    const has = HEADING.exec(line)?.[0]
    const bare = has ? line.slice(has.length) : line
    return has === prefix ? bare : prefix + bare
  })
}

export function toggleBullets(text: string, start: number, end: number): Edit {
  return prefixLines(text, start, end, BULLET, () => '- ')
}

export function toggleNumbers(text: string, start: number, end: number): Edit {
  return prefixLines(text, start, end, NUMBERED, (i) => `${i + 1}. `)
}

function prefixLines(text: string, start: number, end: number, has: RegExp, make: (i: number) => string): Edit {
  const from = lineStart(text, start)
  const to = lineEnd(text, end)
  const lines = text.slice(from, to).split('\n')
  const all = lines.every((l) => has.test(l) || l.trim() === '')
  const next = lines.map((l, i) => (all ? l.replace(has, '') : l.trim() === '' ? l : make(i) + l.replace(HEADING, '').replace(BULLET, '').replace(NUMBERED, '')))
  const joined = next.join('\n')
  return { text: text.slice(0, from) + joined + text.slice(to), start: from, end: from + joined.length }
}

function mapLines(text: string, start: number, end: number, fn: (line: string) => string): Edit {
  const from = lineStart(text, start)
  const to = lineEnd(text, end)
  const joined = text
    .slice(from, to)
    .split('\n')
    .map(fn)
    .join('\n')
  return { text: text.slice(0, from) + joined + text.slice(to), start: from, end: from + joined.length }
}

/** Inline code for a one-line selection, a fenced block when the selection spans lines. */
export function toggleCode(text: string, start: number, end: number): Edit {
  const selected = text.slice(start, end)
  if (!selected.includes('\n')) return wrapSelection(text, start, end, '`', '`', 'code')
  const before = start > 0 && text[start - 1] !== '\n' ? '\n' : ''
  const block = `${before}\`\`\`\n${selected}\n\`\`\`\n`
  return { text: text.slice(0, start) + block + text.slice(end), start: start + before.length, end: start + block.length }
}

/** `[selection](https://)` with the url part selected, ready to be typed over. */
export function insertLink(text: string, start: number, end: number): Edit {
  const label = text.slice(start, end) || 'link text'
  const url = 'https://'
  const next = `${text.slice(0, start)}[${label}](${url})${text.slice(end)}`
  const urlStart = start + label.length + 3
  return { text: next, start: urlStart, end: urlStart + url.length }
}

/** The text of the last heading at or above a 1-based line (edit mode), or null. */
export function headingAtLine(text: string, line: number): string | null {
  const lines = text.split('\n')
  let inFence = false
  let found: string | null = null
  for (let i = 0; i < Math.min(line, lines.length); i++) {
    if (/^\s*```/.test(lines[i])) inFence = !inFence
    else if (!inFence) {
      const m = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(lines[i])
      if (m) found = m[1]
    }
  }
  return found
}

/** Line (1-based) of a character offset. */
export const lineOf = (text: string, offset: number): number => text.slice(0, offset).split('\n').length
