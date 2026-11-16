// Fails when a static data-testid of the renderer UI is not written in any docs/help/*.md file.
//
// Collects the ids of src/renderer/src/lib/{apps,desktop,launcher,pages}/**/*.svelte (not stories):
//   data-testid="x"   testid="x"   rowTestid="x"   testid: 'x'   data-testid={cond ? 'a' : `b-${n}`}
// A template id keeps its static prefix and ends with `*`: `chat-message-{id}` becomes `chat-message-*`.
// An id counts as documented when it appears as a whole word in a docs/help/*.md file
// (letters, digits, `-` and `*`, so `explorer-item` does not match inside `explorer-item-count`).
//
// Run: node scripts/check-help-coverage.mjs   (npm run help:coverage)
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_DIRS = ['apps', 'desktop', 'launcher', 'pages'].map((d) => join(root, 'src/renderer/src/lib', d))
const HELP_DIR = join(root, 'docs/help')

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
    console.error(`help:coverage: ${missing.length} data-testid value(s) are not in any docs/help/*.md file:\n`)
    for (const [id, file] of missing) console.error(`  ${id}   (${file})`)
    console.error('\nDocument each id in the Controls reference table of the manual of its app (see docs/CONVENTIONS.md).')
    process.exit(1)
  }
  console.log(`help:coverage: ${found.size} ids found, all documented (${ignored.size} ignored).`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
