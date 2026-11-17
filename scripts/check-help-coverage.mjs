// Fails when a static data-testid of the renderer UI is not written in any manuals/*.md file.
//
// Collects the ids of src/renderer/src/lib/{apps,desktop,launcher,pages}/**/*.svelte (not stories):
//   data-testid="x"   testid="x"   rowTestid="x"   testid: 'x'   data-testid={cond ? 'a' : `b-${n}`}
// A template id keeps its static prefix and ends with `*`: `chat-message-{id}` becomes `chat-message-*`.
// An id counts as documented when it appears as a whole word in a manuals/*.md file
// (letters, digits, `-` and `*`, so `explorer-item` does not match inside `explorer-item-count`).
//
// It also fails the other way round: an id in the last column of a manual's table that no source file can produce any
// more (the control was deleted, the manual was not updated). An id counts as produced when its text is in a renderer
// source file, or when it fits a string built at run time (`${prefix}-dow-${i}`, "{testid}-detail-more"). Ids built in
// ways that cannot be read from the text are listed in DYNAMIC_DOC_IDS, each with a reason.
//
// Run: node scripts/check-help-coverage.mjs   (npm run help:coverage)
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_DIRS = ['apps', 'desktop', 'launcher', 'pages'].map((d) => join(root, 'src/renderer/src/lib', d))
const HELP_DIR = join(root, 'manuals')

/** Files that are not product UI. */
const IGNORED_FILES = [
  { match: /\.stories\.svelte$/, reason: 'Storybook stories are not part of the product.' },
  { match: /(^|\/)(AppStory|LauncherStory)\.svelte$/, reason: 'Story harness, not part of the product.' }
]

/**
 * Ids that need no manual entry. Every entry has a reason. Keep this list short:
 * a control that people can use belongs in a manual.
 */
const IGNORED_IDS = [
  // { id: 'example-internal-*', reason: 'Why the id is internal to the kit.' }
]

/** Documented ids that the stale check cannot trace to the source text. Every entry has a reason; keep it short. */
const DYNAMIC_DOC_IDS = [
  { match: /-(menu|ctx)-select-all$/, reason: 'standardMenu builds it as `${idPrefix}-${key === "selectAll" ? "select-all" : key}`.' },
  { match: /^event-viewer-action-[a-z-]+$/, reason: 'Event Viewer derives the action ids from the action labels.' },
  { match: /^diagrams-ctx-(layout|zoom)-\*$/, reason: 'The context menu reuses the menu bar items with testid.replace("-menu-", "-ctx-").' },
  { match: /-option-\*$/, reason: 'ComboBox gives each option `${testid}-option-${value}`.' },
  { match: /^menubar-\*-menu$/, reason: 'MenuStrip names an open menu `menubar-${menu}-menu`.' },
  { match: /^(basic-wizard-action|action-dialog)-(skill|server|tool)-\*$/, reason: 'CapabilitiesFields passes `${prefix}-skill` (server, tool) and refChoices / toolChoices add the item id.' }
]

/** The ids of the Controls Reference tables: backticked ids in the last column of a table row. */
export function tableIds(markdown) {
  const ids = []
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('|')) continue
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean)
    for (const m of (cells.at(-1) ?? '').matchAll(/`([a-z][a-z0-9*-]+)`/g)) if (m[1].includes('-')) ids.push(m[1])
  }
  return ids
}

/** Patterns of the strings the source builds at run time: each `${...}` or `{...}` part may be any id text. */
export function runtimePatterns(src) {
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = []
  for (const m of src.matchAll(/`([^`]*\$\{[^`]*)`|"([^"\n]*\{[a-zA-Z_.$()?:' ]+\}[^"\n]*)"/g)) {
    const parts = (m[1] ?? m[2]).split(/\$?\{[^}]*\}/)
    if (!parts.some((p) => /[a-z]-|-[a-z]/.test(p)) || parts.some((p) => /[^a-z0-9-]/.test(p))) continue
    // A string that starts with a run-time part (`{testid}-detail-view`): that part is a prefix some caller passes, so
    // remember the pattern with the prefix captured, to check that the prefix is in the source.
    patterns.push({ re: new RegExp(`^${parts[0] === '' ? '([a-z0-9-]+?)' : ''}${parts.map(esc).join('[a-z0-9-]+').replace(/^\[a-z0-9-\]\+/, '')}$`), leading: parts[0] === '' })
  }
  return patterns
}

/** Documented ids that no source can produce any more. */
export function staleIds(documented, src, dynamic = DYNAMIC_DOC_IDS) {
  const patterns = runtimePatterns(src)
  const quoted = (t) => ['"', "'", '`'].some((q) => src.includes(`${q}${t}${q}`) || src.includes(`${q}${t}-`))
  /** True when the source can produce `text`: as written, or from a run-time string whose leading part it can produce too. */
  const produced = (text, depth = 0) => {
    if (src.includes(text)) return true
    if (depth > 2) return false
    for (const p of patterns) {
      const m = p.re.exec(text)
      if (m && (!p.leading || quoted(m[1]) || produced(m[1], depth + 1))) return true
    }
    return false
  }
  return documented.filter((id) => {
    const probe = id.endsWith('*') ? `${id.slice(0, -1)}x` : id
    if (id.endsWith('*') && src.includes(id.slice(0, -1))) return false
    return !produced(probe) && !dynamic.some((d) => d.match.test(id))
  })
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* walk(path)
    else if (name.endsWith('.svelte')) yield path
  }
}

/** The index after the string that starts at `start` (a quote). `{...}` inside a double-quoted attribute may contain quotes. */
function endOfString(src, start) {
  const quote = src[start]
  let depth = 0
  for (let i = start + 1; i < src.length; i++) {
    const c = src[i]
    if (c === '\\') i++
    else if (quote === '"' && c === '{') depth++
    else if (quote === '"' && c === '}') depth = Math.max(0, depth - 1)
    else if (c === quote && depth === 0) return i
    else if (quote === '`' && c === '$' && src[i + 1] === '{') {
      i = endOfBraces(src, i + 1)
    }
  }
  return src.length
}

/** The index of the `}` that closes the `{` at `start`. */
function endOfBraces(src, start) {
  let depth = 0
  for (let i = start; i < src.length; i++) {
    const c = src[i]
    if (c === '"' || c === "'" || c === '`') i = endOfString(src, i)
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return i
  }
  return src.length
}

const ID = /^[a-z][a-z0-9]*(-[a-z0-9{$]+)+/

/** `x-${n}` or `x-{n}` becomes `x-*`; a plain string stays. Returns null when it does not look like an id. */
function toId(text) {
  const cut = text.search(/\$?\{/)
  const id = cut === -1 ? text : `${text.slice(0, cut)}*`
  return ID.test(text) && /^[a-z][a-z0-9-]*\*?$/.test(id) ? id : null
}

/** All string literals of an expression (outside nested strings). */
function literals(expr) {
  const out = []
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i]
    if (c === '"' || c === "'" || c === '`') {
      const end = endOfString(expr, i)
      out.push(expr.slice(i + 1, end))
      i = end
    }
  }
  return out
}

export function collectIds(src) {
  const ids = new Set()
  const key = /(?:data-testid|\b[a-zA-Z]*[tT]estid)\s*[=:]\s*/g
  for (let m; (m = key.exec(src)); ) {
    const at = key.lastIndex
    const c = src[at]
    let texts = []
    if (c === '"' || c === "'" || c === '`') {
      texts = [src.slice(at + 1, endOfString(src, at))]
    } else if (c === '{') {
      texts = literals(src.slice(at + 1, endOfBraces(src, at)))
    }
    for (const t of texts) {
      const id = toId(t)
      if (id) ids.add(id)
    }
  }
  return ids
}

/** Every renderer source file (Svelte and TypeScript, not tests or stories). */
function* walkAll(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* walkAll(path)
    else if (/\.(svelte|ts)$/.test(name) && !/\.test\.ts$|\.stories\./.test(name)) yield path
  }
}

function documentedIds() {
  const words = new Set()
  for (const name of readdirSync(HELP_DIR)) {
    if (!name.endsWith('.md')) continue
    const text = readFileSync(join(HELP_DIR, name), 'utf8')
    for (const w of text.match(/[a-z0-9][a-z0-9*-]*/g) ?? []) words.add(w)
  }
  return words
}

function main() {
  const found = new Map() // id -> first file
  for (const dir of SOURCE_DIRS) {
    for (const file of walk(dir)) {
      const rel = relative(root, file).replaceAll('\\', '/')
      if (IGNORED_FILES.some((f) => f.match.test(rel))) continue
      for (const id of collectIds(readFileSync(file, 'utf8'))) if (!found.has(id)) found.set(id, rel)
    }
  }
  const ignored = new Set(IGNORED_IDS.map((i) => i.id))
  for (const entry of IGNORED_IDS) if (!entry.reason) throw new Error(`Ignore list entry ${entry.id} has no reason.`)
  const documented = documentedIds()
  const missing = [...found].filter(([id]) => !ignored.has(id) && !documented.has(id)).sort(([a], [b]) => a.localeCompare(b))
  if (missing.length > 0) {
    console.error(`help:coverage: ${missing.length} data-testid value(s) are not in any manuals/*.md file:\n`)
    for (const [id, file] of missing) console.error(`  ${id}   (${file})`)
    console.error('\nDocument each id in the Controls reference table of the manual of its app (see docs/CONVENTIONS.md).')
    process.exit(1)
  }
  // The other way round: ids that a manual documents but no control has any more.
  const rendererSrc = [...walkAll(join(root, 'src/renderer/src'))].map((f) => readFileSync(f, 'utf8')).join('\n')
  const stale = []
  for (const name of readdirSync(HELP_DIR).filter((n) => n.endsWith('.md'))) {
    for (const id of staleIds(tableIds(readFileSync(join(HELP_DIR, name), 'utf8')), rendererSrc)) stale.push(`${id}   (manuals/${name})`)
  }
  if (stale.length > 0) {
    console.error(`help:coverage: ${stale.length} documented data-testid value(s) no longer exist in the source:\n`)
    for (const line of stale) console.error(`  ${line}`)
    console.error('\nRemove the row or describe the control that replaced it. An id built in a way the check cannot read goes in DYNAMIC_DOC_IDS with a reason.')
    process.exit(1)
  }
  console.log(`help:coverage: ${found.size} ids found, all documented (${ignored.size} ignored); no documented id is stale.`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
