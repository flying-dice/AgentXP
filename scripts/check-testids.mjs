// Fails when an interactive element of the renderer UI has no stable `data-testid`.
//
// Agents and e2e specs find controls by test id (docs/CONVENTIONS.md "Test ids", AGENTS.md), so every control a
// person can use must carry one. Scans src/renderer/src/lib/{apps,desktop,launcher,pages}/**/*.svelte (not stories)
// and reports each opening tag that is interactive but has no `data-testid=`, `testid=` or `{...spread}`:
//
//   - native controls: <button>, <input> (not hidden), <select>, <textarea>, <a href|onclick>, <summary>;
//   - any element with an interactive role (button, link, menuitem, tab, checkbox, radio, option, switch, slider,
//     textbox, combobox, treeitem, gridcell) or a click / double-click / key / pointer-down handler, unless its
//     role marks a wrapper (presentation, region, list, ...: key routing and click-through areas are not controls);
//   - the kit's input controls (KIT_CONTROLS below), which take a `testid` (or `data-testid`) prop.
//
// Also reports menu items (`{ label: ..., action: ... }` objects in a .svelte or .ts file of those folders) that
// have neither `testid:` nor `id:` (an `id` renders as `menu-item-<id>`).
//
// Run: node scripts/check-testids.mjs   (npm run testids)
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_DIRS = ['apps', 'desktop', 'launcher', 'pages'].map((d) => join(root, 'src/renderer/src/lib', d))

const IGNORED_FILES = [/\.stories\.svelte$/, /(^|\/)(AppStory|LauncherStory)\.svelte$/, /\.test\.ts$/]

export const KIT_CONTROLS = [
  'Button', 'CheckBox', 'CheckedListBox', 'ColorPalette', 'ComboBox', 'DateTimePicker', 'DomainUpDown', 'LinkLabel',
  'ListBox', 'ListView', 'DataGridView', 'MaskedTextBox', 'MonthCalendar', 'NumericUpDown', 'RadioButton', 'TextBox',
  'TimeUpDown', 'TrackBar', 'TreeView', 'ToolStripButton', 'ToolStripDropDownButton', 'ToolStripColorButton',
  'TaskPaneLink', 'RichTextBox', 'PropertyGrid', 'DesktopIcon'
]
const NATIVE = new Set(['button', 'select', 'textarea', 'summary'])
const ROLES = /^(button|link|menuitem|menuitemcheckbox|menuitemradio|tab|checkbox|radio|option|switch|slider|textbox|combobox|treeitem|gridcell|spinbutton)$/
const HANDLERS = /^(onclick|ondblclick|onkeydown|onkeyup|onpointerdown|onmousedown)$/
const ID_ATTRS = new Set(['data-testid', 'testid', 'rowTestid'])
/** Roles that mark a wrapper rather than a control (key routing, click-through areas). */
const NOT_CONTROLS = /^(presentation|none|region|application|group|list|grid|tree|tablist|menu|toolbar|document)$/

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* walk(path)
    else if (/\.(svelte|ts)$/.test(name)) yield path
  }
}

function skipString(src, i) {
  const q = src[i]
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === '\\') j++
    else if (q === '`' && src[j] === '$' && src[j + 1] === '{') j = skipBraces(src, j + 1)
    else if (src[j] === q) return j
  }
  return src.length
}
function skipBraces(src, i) {
  let depth = 0
  for (let j = i; j < src.length; j++) {
    const c = src[j]
    if (c === '"' || c === "'" || c === '`') j = skipString(src, j)
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return j
  }
  return src.length
}

/** Attributes of the tag whose name ends at `i`; returns { attrs, end }. */
function readTag(src, i) {
  const attrs = []
  let spread = false
  while (i < src.length) {
    const c = src[i]
    if (c === '>' ) return { attrs, spread, end: i }
    if (c === '/' && src[i + 1] === '>') return { attrs, spread, end: i + 1 }
    if (/\s/.test(c)) { i++; continue }
    if (c === '{') {
      const close = skipBraces(src, i)
      const inner = src.slice(i + 1, close).trim()
      if (inner.startsWith('...')) spread = true
      else attrs.push({ name: inner, value: `{${inner}}` }) // {shorthand}
      i = close + 1
      continue
    }
    const m = /^[^\s=>/{]+/.exec(src.slice(i))
    if (!m) { i++; continue }
    const name = m[0]
    i += name.length
    let value = ''
    if (src[i] === '=') {
      i++
      if (src[i] === '"' || src[i] === "'") {
        // a quoted value may hold {expressions} with quotes inside
        const q = src[i]
        let j = i + 1
        for (; j < src.length && src[j] !== q; j++) if (src[j] === '{') j = skipBraces(src, j)
        value = src.slice(i + 1, j)
        i = j + 1
      } else if (src[i] === '{') {
        const close = skipBraces(src, i)
        value = src.slice(i, close + 1)
        i = close + 1
      } else {
        const v = /^[^\s>]+/.exec(src.slice(i))
        value = v ? v[0] : ''
        i += value.length
      }
    }
    attrs.push({ name, value })
  }
  return { attrs, spread, end: src.length }
}

/** The markup of a .svelte file with <script> and <style> blanked (offsets kept for line numbers). */
function markupOf(src) {
  return src.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, (m) => m.replace(/[^\n]/g, ' ')).replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
}

const lineOf = (src, i) => src.slice(0, i).split('\n').length

export function elementProblems(src) {
  const markup = markupOf(src)
  const out = []
  const tag = /<([A-Za-z][\w.:-]*)/g
  let m
  while ((m = tag.exec(markup))) {
    const name = m[1]
    if (name.startsWith('svelte:')) continue
    const { attrs, spread, end } = readTag(markup, m.index + m[0].length)
    tag.lastIndex = end
    if (spread || attrs.some((a) => ID_ATTRS.has(a.name))) continue
    const get = (n) => attrs.find((a) => a.name === n)
    let why = ''
    if (KIT_CONTROLS.includes(name)) why = name
    else if (/^[a-z]/.test(name)) {
      const role = get('role')?.value ?? ''
      if (NATIVE.has(name)) why = `<${name}>`
      else if (name === 'input' && get('type')?.value !== 'hidden') why = '<input>'
      else if (name === 'a' && (get('href') || get('onclick'))) why = '<a>'
      else if (ROLES.test(role)) why = `role="${role}"`
      else if (NOT_CONTROLS.test(role)) why = ''
      else if (attrs.some((a) => HANDLERS.test(a.name))) why = `<${name} ${attrs.find((a) => HANDLERS.test(a.name)).name}>`
    }
    if (why) out.push({ line: lineOf(src, m.index), why, text: src.slice(m.index, Math.min(end + 1, m.index + 120)).split('\n')[0] })
  }
  return out
}

/** `{ label: ..., action: ... }` menu items without `testid:` or `id:`. */
export function menuItemProblems(src) {
  const out = []
  const re = /\{\s*(?:[\w$]+\s*:|\.\.\.)/g
  let m
  while ((m = re.exec(src))) {
    const close = skipBraces(src, m.index)
    const body = src.slice(m.index + 1, close)
    // only top-level keys of this object
    let flat = ''
    for (let i = 0; i < body.length; i++) {
      const c = body[i]
      if (c === '{' || c === '[' || c === '(') {
        const open = c, shut = { '{': '}', '[': ']', '(': ')' }[c]
        let d = 0
        for (; i < body.length; i++) { if (body[i] === '"' || body[i] === "'" || body[i] === '`') i = skipString(body, i); else if (body[i] === open) d++; else if (body[i] === shut && --d === 0) break }
        flat += ' '
      } else if (c === '"' || c === "'" || c === '`') { i = skipString(body, i); flat += '""' } else flat += c
    }
    if (/(^|[,\s])label\s*:/.test(flat) && /(^|[,\s])action\s*:/.test(flat) && !/(^|[,\s])(testid|id)\s*:/.test(flat) && !/\.\.\./.test(flat)) {
      out.push({ line: lineOf(src, m.index), why: 'menu item', text: src.slice(m.index, m.index + 100).split('\n')[0] })
    }
  }
  return out
}

function main() {
  const problems = []
  for (const dir of SOURCE_DIRS) {
    for (const file of walk(dir)) {
      if (IGNORED_FILES.some((r) => r.test(file))) continue
      const src = readFileSync(file, 'utf8')
      const found = [...(file.endsWith('.svelte') ? elementProblems(src) : []), ...menuItemProblems(src)]
      for (const p of found) problems.push({ file: relative(root, file), ...p })
    }
  }
  if (problems.length) {
    console.error(`testids: ${problems.length} interactive element(s) without a data-testid:\n`)
    for (const p of problems) console.error(`  ${p.file}:${p.line}  ${p.why}\n      ${p.text.trim()}`)
    console.error('\nGive each one a stable data-testid (<area>-<thing>, see docs/CONVENTIONS.md "Test ids") and add it to the manual.')
    process.exit(1)
  }
  console.log('testids: every interactive element has a data-testid.')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
