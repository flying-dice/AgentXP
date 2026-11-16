/**
 * WinForms-style input masks.
 *   0  required digit        9  optional digit
 *   L  required letter       A  required letter or digit
 *   \x escapes a mask character; anything else is a literal.
 */

export type SlotKind = 'digit' | 'optionalDigit' | 'letter' | 'alnum'
export type MaskSlot = { literal: string } | { kind: SlotKind }

const KINDS: Record<string, SlotKind> = { '0': 'digit', '9': 'optionalDigit', L: 'letter', A: 'alnum' }

const TESTS: Record<SlotKind, RegExp> = {
  digit: /^[0-9]$/,
  optionalDigit: /^[0-9]$/,
  letter: /^\p{L}$/u,
  alnum: /^[\p{L}0-9]$/u
}

export function parseMask(mask: string): MaskSlot[] {
  const slots: MaskSlot[] = []
  for (let i = 0; i < mask.length; i++) {
    const ch = mask[i]
    if (ch === '\\' && i + 1 < mask.length) slots.push({ literal: mask[++i] })
    else if (ch in KINDS) slots.push({ kind: KINDS[ch] })
    else slots.push({ literal: ch })
  }
  return slots
}

const isEditable = (slot: MaskSlot): slot is { kind: SlotKind } => 'kind' in slot

export function acceptsChar(kind: SlotKind, ch: string): boolean {
  return TESTS[kind].test(ch)
}

export interface MaskResult {
  /** Display text including literals and prompt characters. */
  text: string
  /** The accepted characters typed into editable slots. */
  raw: string
  /** Every required slot is filled. */
  complete: boolean
}

/** Characters of `text` that were typed by the user (no literals, no prompts). */
export function unmask(mask: string, text: string, promptChar = '_'): string {
  const literals = new Set(parseMask(mask).filter((s) => !isEditable(s)).map((s) => (s as { literal: string }).literal))
  return [...text].filter((c) => c !== promptChar && !literals.has(c)).join('')
}

/** Pour `rawInput` into the mask; characters that do not fit the next slot are dropped. */
export function formatMask(mask: string, rawInput: string, promptChar = '_'): MaskResult {
  const slots = parseMask(mask)
  const input = [...rawInput]
  let next = 0
  let text = ''
  let raw = ''
  let complete = true
  for (const slot of slots) {
    if (!isEditable(slot)) {
      text += slot.literal
      continue
    }
    while (next < input.length && !acceptsChar(slot.kind, input[next])) next++
    if (next < input.length) {
      text += input[next]
      raw += input[next]
      next++
    } else {
      text += promptChar
      if (slot.kind !== 'optionalDigit') complete = false
    }
  }
  return { text, raw, complete }
}

/** Display position of the editable slot that will receive raw character number `rawIndex`. */
export function caretForRawCount(mask: string, rawIndex: number): number {
  const slots = parseMask(mask)
  let seen = 0
  for (let pos = 0; pos < slots.length; pos++) {
    if (!isEditable(slots[pos])) continue
    if (seen === rawIndex) return pos
    seen++
  }
  return slots.length
}

/** Remove raw characters in [from, to); for a collapsed range removes one in `direction`. */
export function deleteRaw(
  raw: string,
  from: number,
  to: number,
  direction: 'backward' | 'forward'
): { raw: string; rawCaret: number } {
  let start = from
  let end = to
  if (start === end) {
    if (direction === 'backward') start = Math.max(0, start - 1)
    else end = Math.min(raw.length, end + 1)
  }
  return { raw: raw.slice(0, start) + raw.slice(end), rawCaret: start }
}
