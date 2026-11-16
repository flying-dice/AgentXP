// Argument parsing for the `ux` CLI and `session.mjs`. Pure functions (unit tested).

/** Commands the panelist may run. `actions` change the app (they count as steps); the others only look. */
export const ACTION_COMMANDS = ['click', 'move', 'drag', 'scroll', 'type', 'key']
export const LOOK_COMMANDS = ['windows', 'switch', 'shot', 'find', 'wait']
export const MAX_WAIT_MS = 10_000

/** name -> { positional: [type...], flags: { name: 'bool' | 'string' } } */
export const COMMAND_SPECS = {
  windows: { positional: [], flags: {} },
  switch: { positional: ['int'], flags: {} },
  shot: { positional: [], flags: { out: 'string' } },
  click: { positional: ['number', 'number'], flags: { double: 'bool', right: 'bool' } },
  move: { positional: ['number', 'number'], flags: {} },
  drag: { positional: ['number', 'number', 'number', 'number'], flags: {} },
  scroll: { positional: ['number', 'number', 'number'], flags: {} },
  type: { positional: ['text'], flags: {} },
  key: { positional: ['text'], flags: {} },
  wait: { positional: ['number'], flags: {} },
  find: { positional: ['text'], flags: {} }
}

/** H-78: `scroll` takes raw pixels (the wheel event's deltaY): 100 is one wheel notch, 200 to 300 is about a page. Below this a scroll moves "a few pixels". */
export const MIN_SCROLL_DY = 20

/** H-78: the warning for a tiny scroll, or null. */
export const scrollWarning = (dy) =>
  Math.abs(dy) < MIN_SCROLL_DY ? `Warning: ${dy} is only ${Math.abs(dy)} pixels (100 is one wheel notch; use 200 to 300 to move about a page). The content moves very little.` : null

/** H-78: what the scroll did, from the scroll position (px) of the scrolled area before and after; `null` when no scrollable area was under the pointer. */
export function scrollReport(dy, before, after, max) {
  if (before === null || before === undefined || after === null || after === undefined) return `Scrolled ${dy}: no scrollable area under the pointer (or the content does not scroll there); the position is not known.`
  const moved = after - before
  const where = `position ${Math.round(before)} -> ${Math.round(after)} of ${Math.round(max)} px`
  if (moved === 0) return `Scrolled ${dy}: nothing moved (${where}; ${dy > 0 ? 'already at the end' : 'already at the start'}).`
  return `Scrolled ${dy}: the content moved ${Math.abs(Math.round(moved))} px ${moved > 0 ? 'down' : 'up'} (${where}).`
}

const isNumberToken = (t) => /^-?\d+(\.\d+)?$/.test(t)

/**
 * Generic flag parser. `flags` maps a flag name to 'bool' or 'string'. A token that looks like a negative number is a
 * positional (`scroll 10 10 -300`). `--` ends flag parsing (so `type -- "--x"` types `--x`). `--name=value` works too.
 */
export function parseArgs(argv, flagSpec = {}) {
  const positional = []
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (token === '--') {
      positional.push(...argv.slice(i + 1))
      break
    }
    if (token.startsWith('--') && token.length > 2) {
      const [name, inline] = token.slice(2).split(/=(.*)/s)
      const kind = flagSpec[name]
      if (!kind) throw new Error(`unknown option --${name}`)
      if (kind === 'bool') flags[name] = inline === undefined ? true : inline !== 'false'
      else {
        const value = inline ?? argv[++i]
        if (value === undefined) throw new Error(`option --${name} needs a value`)
        flags[name] = value
      }
      continue
    }
    positional.push(token)
  }
  return { positional, flags }
}

/** Parses `ux <command> ...` into `{ cmd, args, flags }` or throws an Error with a usage message. */
export function parseCommand(argv) {
  const [cmd, ...rest] = argv
  const spec = COMMAND_SPECS[cmd]
  if (!spec) throw new Error(`unknown command "${cmd ?? ''}". Commands: ${Object.keys(COMMAND_SPECS).join(', ')}`)
  const { positional, flags } = parseArgs(rest, spec.flags)
  if (positional.length !== spec.positional.length) throw new Error(`${cmd} takes ${spec.positional.length} value(s), got ${positional.length}`)
  const args = positional.map((token, i) => {
    const type = spec.positional[i]
    if (type === 'text') return token
    if (!isNumberToken(token)) throw new Error(`${cmd}: "${token}" is not a number`)
    const n = Number(token)
    if (type === 'int' && !Number.isInteger(n)) throw new Error(`${cmd}: "${token}" is not a whole number`)
    return n
  })
  if (cmd === 'click' && flags.double && flags.right) throw new Error('click: use either --double or --right')
  if (cmd === 'wait') {
    if (args[0] < 0 || args[0] > MAX_WAIT_MS) throw new Error(`wait: between 0 and ${MAX_WAIT_MS} ms`)
  }
  return { cmd, args, flags }
}

const MODIFIERS = { ctrl: 'Control', control: 'Control', alt: 'Alt', option: 'Alt', shift: 'Shift', cmd: 'Meta', command: 'Meta', meta: 'Meta', win: 'Meta', super: 'Meta' }
const KEY_ALIASES = { esc: 'Escape', escape: 'Escape', return: 'Enter', enter: 'Enter', del: 'Delete', delete: 'Delete', backspace: 'Backspace', tab: 'Tab', space: 'Space', up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', pgup: 'PageUp', pageup: 'PageUp', pgdn: 'PageDown', pagedown: 'PageDown', home: 'Home', end: 'End', insert: 'Insert' }

/** `ctrl+n` -> `Control+n`, `esc` -> `Escape`, `f1` -> `F1`. Playwright combos pass through. */
export function normalizeKey(combo) {
  const parts = combo.split('+').filter((p, i, all) => p !== '' || i === all.length - 1)
  return parts
    .map((part, i) => {
      if (part === '') return '+'
      const lower = part.toLowerCase()
      if (i < parts.length - 1) return MODIFIERS[lower] ?? part
      if (/^f\d{1,2}$/.test(lower)) return lower.toUpperCase()
      return KEY_ALIASES[lower] ?? part
    })
    .join('+')
}
