/** Caret position of a textarea offset: 1-based line and column. */
export function caretPosition(text: string, offset: number): { line: number; col: number } {
  const before = text.slice(0, Math.max(0, Math.min(offset, text.length)))
  const line = before.split('\n').length
  return { line, col: before.length - (before.lastIndexOf('\n') + 1) + 1 }
}

/** Offset of the start of a 1-based line (clamped). */
export function offsetOfLine(text: string, line: number): number {
  let offset = 0
  for (let i = 1; i < line; i++) {
    const next = text.indexOf('\n', offset)
    if (next < 0) return text.length
    offset = next + 1
  }
  return offset
}
