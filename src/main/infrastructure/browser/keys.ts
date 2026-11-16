/**
 * Key chords for `browser_press`: "Enter", "Control+K", "Shift+Enter", "ArrowDown ArrowDown Enter" (a space separates
 * chords that are pressed one after the other). `keyEvents` turns a chord into `Input.dispatchKeyEvent` parameters.
 */

export interface Chord {
  /** DOM `key` value: "Enter", "k", "ArrowDown". */
  key: string
  code: string
  keyCode: number
  /** CDP modifier bit mask: Alt 1, Control 2, Meta 4, Shift 8. */
  modifiers: number
  /** What the key types (absent for Enter's "\r" handled below, Escape, arrows, chords with Control/Alt/Meta). */
  text?: string
}

export interface KeyEventParams {
  type: 'keyDown' | 'rawKeyDown' | 'keyUp'
  key: string
  code: string
  windowsVirtualKeyCode: number
  nativeVirtualKeyCode: number
  modifiers: number
  text?: string
  unmodifiedText?: string
  /** Editing commands Chrome runs for the shortcut (select all, copy, ...), so it works on every platform. */
  commands?: string[]
}

const MODIFIER_BITS: Record<string, number> = {
  alt: 1,
  option: 1,
  control: 2,
  ctrl: 2,
  meta: 4,
  cmd: 4,
  command: 4,
  win: 4,
  windows: 4,
  super: 4,
  shift: 8
}

interface Named {
  key: string
  code: string
  keyCode: number
  text?: string
}

const NAMED: Record<string, Named> = {
  enter: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
  return: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
  escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
  esc: { key: 'Escape', code: 'Escape', keyCode: 27 },
  tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
  backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
  delete: { key: 'Delete', code: 'Delete', keyCode: 46 },
  insert: { key: 'Insert', code: 'Insert', keyCode: 45 },
  space: { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
  arrowup: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  arrowdown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  arrowleft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  arrowright: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  up: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  down: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  left: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  home: { key: 'Home', code: 'Home', keyCode: 36 },
  end: { key: 'End', code: 'End', keyCode: 35 },
  pageup: { key: 'PageUp', code: 'PageUp', keyCode: 33 },
  pagedown: { key: 'PageDown', code: 'PageDown', keyCode: 34 }
}

/** US layout punctuation: character -> [code, keyCode, shifted character]. */
const PUNCTUATION: Record<string, [string, number]> = {
  ';': ['Semicolon', 186],
  '=': ['Equal', 187],
  ',': ['Comma', 188],
  '-': ['Minus', 189],
  '.': ['Period', 190],
  '/': ['Slash', 191],
  '`': ['Backquote', 192],
  '[': ['BracketLeft', 219],
  '\\': ['Backslash', 220],
  ']': ['BracketRight', 221],
  "'": ['Quote', 222],
  '+': ['Equal', 187]
}

const isModifier = (word: string): boolean => word.toLowerCase() in MODIFIER_BITS

/** Splits "Control+Shift+K" into words; a trailing "+" is the plus key ("Control++"). */
function words(chord: string): string[] {
  const out: string[] = []
  let current = ''
  for (let i = 0; i < chord.length; i++) {
    const ch = chord[i]
    if (ch === '+' && current !== '') {
      out.push(current)
      current = ''
    } else current += ch
  }
  if (current !== '') out.push(current)
  return out
}

/** One chord. Throws a readable error for an unknown key. */
export function parseChord(text: string): Chord {
  const parts = words(text.trim())
  if (parts.length === 0) throw new Error('Empty key chord.')
  const keyWord = parts[parts.length - 1]
  let modifiers = 0
  for (const word of parts.slice(0, -1)) {
    const bit = MODIFIER_BITS[word.toLowerCase()]
    if (!bit) throw new Error(`Unknown modifier "${word}" in "${text}". Use Control, Shift, Alt or Meta.`)
    modifiers |= bit
  }
  if (isModifier(keyWord) && parts.length === 1) {
    // A bare modifier ("Shift") is a key press of its own.
    const bit = MODIFIER_BITS[keyWord.toLowerCase()]
    const name = bit === 1 ? 'Alt' : bit === 2 ? 'Control' : bit === 4 ? 'Meta' : 'Shift'
    return { key: name, code: `${name}Left`, keyCode: bit === 1 ? 18 : bit === 2 ? 17 : bit === 4 ? 91 : 16, modifiers: bit }
  }
  const named = NAMED[keyWord.toLowerCase()]
  const functionKey = /^f([1-9]|1[0-2])$/i.exec(keyWord)
  const typing = (modifiers & ~8) === 0 // Shift alone still types
  let base: Named
  if (named) base = named
  else if (functionKey) base = { key: `F${functionKey[1]}`, code: `F${functionKey[1]}`, keyCode: 111 + Number(functionKey[1]) }
  else if (keyWord.length === 1) {
    const ch = keyWord
    if (/[a-z]/i.test(ch)) base = { key: modifiers & 8 ? ch.toUpperCase() : ch.toLowerCase(), code: `Key${ch.toUpperCase()}`, keyCode: ch.toUpperCase().charCodeAt(0), text: modifiers & 8 ? ch.toUpperCase() : ch.toLowerCase() }
    else if (/[0-9]/.test(ch)) base = { key: ch, code: `Digit${ch}`, keyCode: ch.charCodeAt(0), text: ch }
    else {
      const p = PUNCTUATION[ch]
      base = { key: ch, code: p?.[0] ?? '', keyCode: p?.[1] ?? ch.charCodeAt(0), text: ch }
    }
  } else throw new Error(`Unknown key "${keyWord}". Examples: Enter, Escape, Tab, ArrowDown, Control+K, Shift+Enter, F5.`)
  const chord: Chord = { key: base.key, code: base.code, keyCode: base.keyCode, modifiers }
  if (base.text && typing) chord.text = base.text
  return chord
}

/** A sequence of chords, separated by spaces. */
export function parseKeys(keys: string): Chord[] {
  const chords = keys.trim().split(/\s+/).filter(Boolean).map(parseChord)
  if (chords.length === 0) throw new Error('No keys given.')
  return chords
}

/** Editing commands Chrome runs for common shortcuts (needed on macOS, harmless elsewhere). */
function commandsFor(chord: Chord): string[] | undefined {
  if (!(chord.modifiers & 6) || chord.modifiers & 1) return undefined
  const shifted = (chord.modifiers & 8) !== 0
  switch (chord.key.toLowerCase()) {
    case 'a':
      return ['selectAll']
    case 'c':
      return ['copy']
    case 'v':
      return shifted ? ['pasteAndMatchStyle'] : ['paste']
    case 'x':
      return ['cut']
    case 'z':
      return shifted ? ['redo'] : ['undo']
    default:
      return undefined
  }
}

/** The `Input.dispatchKeyEvent` calls that press and release a chord. */
export function keyEvents(chord: Chord): KeyEventParams[] {
  const base = { key: chord.key, code: chord.code, windowsVirtualKeyCode: chord.keyCode, nativeVirtualKeyCode: chord.keyCode, modifiers: chord.modifiers }
  const down: KeyEventParams = chord.text
    ? { ...base, type: 'keyDown', text: chord.text, unmodifiedText: chord.text }
    : { ...base, type: 'rawKeyDown' }
  const commands = commandsFor(chord)
  if (commands) down.commands = commands
  return [down, { ...base, type: 'keyUp' }]
}
