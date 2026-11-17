// Fails when an app of the desktop skips one of the five pillars without saying why.
//
// Every app kind (APP_KINDS in src/shared/desktop.ts) needs an entry in scripts/app-pillars.json, and each entry
// meets the five pillars of docs/APP_PILLARS.md, or lists the pillar under `gaps` (work still to do) or `exempt`
// (never needed), each with a reason:
//
//   ui        The app's window component exists and is in the registry (src/renderer/src/lib/apps/registry.ts).
//   backend   The main-process files that own its state or do its work exist.
//   agentApi  It has agent tools (names or `prefix_*` from the agentxp MCP server: tools/catalog.ts or a2ui/mcp-tools.ts),
//             and each of them is named in a unit test under src/main.
//   e2e       A dedicated Playwright spec exists and finds the app's own controls (getByTestId('<area>-...')).
//   docs      manuals/<kind>.md exists and names every agent tool of the app (help:coverage checks the controls).
//
// A pillar listed under `gaps` that is met fails too, so the table stays true: delete the gap when you close it.
//
// Run: node scripts/check-app-pillars.mjs            (npm run app:pillars)
//      node scripts/check-app-pillars.mjs --write    rewrites the table in docs/APP_PILLARS.md
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(root, rel), 'utf8')
const exists = (rel) => existsSync(join(root, rel))

export const PILLARS = ['ui', 'backend', 'agentApi', 'e2e', 'docs']
const PILLAR_NAMES = { ui: 'UI', backend: 'Backend', agentApi: 'Agent API', e2e: 'E2E', docs: 'Docs' }
const TABLE_START = '<!-- app-pillars:start -->'
const TABLE_END = '<!-- app-pillars:end -->'

function appKinds() {
  const src = read('src/shared/desktop.ts')
  const block = src.match(/export const APP_KINDS = \[([\s\S]*?)\] as const/)
  if (!block) throw new Error('APP_KINDS not found in src/shared/desktop.ts')
  return [...block[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
}

function agentTools() {
  const names = new Set()
  const catalog = read('src/main/application/tools/catalog.ts')
  const defs = catalog.slice(catalog.indexOf('export const TOOL_DEFS'))
  for (const m of defs.matchAll(/^ {2}([a-z0-9]+_[a-z0-9_]+|[a-z0-9]+_[a-z0-9]+): \{/gm)) names.add(m[1])
  for (const m of read('src/main/infrastructure/a2ui/mcp-tools.ts').matchAll(/name: '([a-z0-9_]+)'/g)) names.add(m[1])
  return names
}

function* walk(dir, test) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* walk(path, test)
    else if (test(name)) yield path
  }
}

/** Text of every unit test under src/main, for "is this tool tested". */
function mainTests() {
  return [...walk(join(root, 'src/main'), (n) => n.endsWith('.test.ts'))].map((p) => readFileSync(p, 'utf8')).join('\n')
}

const matches = (pattern, name) => (pattern.endsWith('*') ? name.startsWith(pattern.slice(0, -1)) : name === pattern)

/** Evaluates the pillars of one app. Returns { met: {pillar: bool}, problems: string[] (why a pillar is not met) }. */
export function evaluate(kind, entry, ctx) {
  const met = {}
  const why = {}
  const fail = (pillar, reason) => {
    met[pillar] = false
    ;(why[pillar] ??= []).push(reason)
  }

  // UI
  met.ui = true
  if (!entry.ui || !exists(entry.ui)) fail('ui', `window component ${entry.ui ?? '(none)'} does not exist`)
  if (!new RegExp(`(^|\\s|')${kind}'?: \\{ kind: '${kind}'`, 'm').test(ctx.registry)) fail('ui', 'not in apps/registry.ts')
  if (!ctx.uiSources[kind]?.includes(`data-testid="${kind}-app"`)) fail('ui', `no root test id "${kind}-app"`)

  // Backend
  met.backend = true
  if (!entry.backend?.length) fail('backend', 'no main-process files listed')
  for (const file of entry.backend ?? []) if (!exists(file)) fail('backend', `${file} does not exist`)

  // Agent API
  met.agentApi = true
  const tools = [...ctx.tools].filter((t) => (entry.tools ?? []).some((p) => matches(p, t))).sort()
  if (!entry.tools?.length) fail('agentApi', 'no agent tools')
  for (const p of entry.tools ?? []) if (![...ctx.tools].some((t) => matches(p, t))) fail('agentApi', `no tool matches ${p}`)
  const untested = tools.filter((t) => !new RegExp(`\\b${t}\\b`).test(ctx.tests))
  if (untested.length) fail('agentApi', `no unit test names ${untested.join(', ')}`)

  // E2E
  met.e2e = true
  // `e2e` lists specs and the page objects (e2e/fixtures/pages) they use; together they must find the app's controls.
  const files = entry.e2e ?? []
  if (!files.some((f) => f.endsWith('.e2e.ts'))) fail('e2e', 'no dedicated spec (*.e2e.ts)')
  for (const f of files) if (!exists(f)) fail('e2e', `${f} does not exist`)
  const found = files.filter(exists).some((f) => read(f).includes(`'${entry.area}-`))
  if (files.length && !found) fail('e2e', `${files.join(', ')} never find a "${entry.area}-..." control`)

  // Docs
  met.docs = true
  if (!entry.manual || !exists(entry.manual)) fail('docs', `manual ${entry.manual ?? '(none)'} does not exist`)
  else {
    const manual = read(entry.manual)
    const missing = tools.filter((t) => !new RegExp(`\\b${t}\\b`).test(manual))
    if (missing.length) fail('docs', `the manual does not name ${missing.join(', ')}`)
  }

  return { met, why, tools }
}

function load() {
  const manifest = JSON.parse(read('scripts/app-pillars.json'))
  const registry = read('src/renderer/src/lib/apps/registry.ts')
  const uiSources = {}
  for (const [kind, entry] of Object.entries(manifest.apps)) {
    if (!entry.ui || !exists(entry.ui)) continue
    // The root test id may live in any .svelte file of the app's folder.
    const dir = dirname(join(root, entry.ui))
    uiSources[kind] = [...walk(dir, (n) => n.endsWith('.svelte'))].map((p) => readFileSync(p, 'utf8')).join('\n')
  }
  return { manifest, ctx: { registry, uiSources, tools: agentTools(), tests: mainTests() } }
}

function check() {
  const { manifest, ctx } = load()
  const kinds = appKinds()
  const errors = []
  const rows = []
  for (const kind of kinds) if (!manifest.apps[kind]) errors.push(`${kind}: no entry in scripts/app-pillars.json. Add one (see .claude/skills/new-agentxp-app).`)
  for (const kind of Object.keys(manifest.apps)) if (!kinds.includes(kind)) errors.push(`${kind}: in scripts/app-pillars.json but not an app kind.`)

  for (const kind of kinds) {
    const entry = manifest.apps[kind]
    if (!entry) continue
    const { met, why } = evaluate(kind, entry, ctx)
    const gaps = entry.gaps ?? {}
    const exempt = entry.exempt ?? {}
    for (const p of [...Object.keys(gaps), ...Object.keys(exempt)]) if (!PILLARS.includes(p)) errors.push(`${kind}: unknown pillar "${p}".`)
    const row = { kind, cells: {} }
    for (const p of PILLARS) {
      const reason = gaps[p] ?? exempt[p]
      if (reason !== undefined && !String(reason).trim()) errors.push(`${kind}: the ${p} gap or exemption has no reason.`)
      if (gaps[p] && exempt[p]) errors.push(`${kind}: ${p} is both a gap and exempt.`)
      if (met[p]) {
        if (gaps[p]) errors.push(`${kind}: ${p} is met now. Delete the gap from scripts/app-pillars.json.`)
        row.cells[p] = exempt[p] ? 'exempt' : 'yes'
      } else if (exempt[p]) row.cells[p] = 'exempt'
      else if (gaps[p]) row.cells[p] = 'gap'
      else errors.push(`${kind}: the ${PILLAR_NAMES[p]} pillar is not met (${why[p].join('; ')}). Meet it, or list it under "gaps" with a reason.`)
      row.reasons = { ...gaps, ...exempt }
    }
    rows.push(row)
  }
  return { errors, rows }
}

export function renderTable(rows) {
  const mark = { yes: 'Yes', gap: '**Gap**', exempt: 'n/a' }
  const head = `| App | ${PILLARS.map((p) => PILLAR_NAMES[p]).join(' | ')} |\n|---|${PILLARS.map(() => '---').join('|')}|`
  const body = rows.map((r) => `| ${r.kind} | ${PILLARS.map((p) => mark[r.cells[p]] ?? '?').join(' | ')} |`).join('\n')
  const notes = rows
    .flatMap((r) => PILLARS.filter((p) => r.cells[p] !== 'yes' && r.reasons[p]).map((p) => `- **${r.kind}, ${PILLAR_NAMES[p]}** (${r.cells[p] === 'gap' ? 'gap' : 'not needed'}): ${r.reasons[p]}`))
    .join('\n')
  const open = rows.reduce((n, r) => n + PILLARS.filter((p) => r.cells[p] === 'gap').length, 0)
  return `${TABLE_START}\n${head}\n${body}\n\n${open} open gap(s).${notes ? `\n\n${notes}` : ''}\n${TABLE_END}`
}

function main() {
  const { errors, rows } = check()
  const docPath = join(root, 'docs/APP_PILLARS.md')
  const table = renderTable(rows)
  const doc = existsSync(docPath) ? readFileSync(docPath, 'utf8') : ''
  const start = doc.indexOf(TABLE_START)
  const end = doc.indexOf(TABLE_END)
  const current = start >= 0 && end > start ? doc.slice(start, end + TABLE_END.length) : null
  if (process.argv.includes('--write')) {
    if (current === null) throw new Error(`docs/APP_PILLARS.md has no ${TABLE_START} ... ${TABLE_END} block`)
    writeFileSync(docPath, doc.replace(current, table))
    console.log('app:pillars: wrote the table in docs/APP_PILLARS.md')
  } else if (current !== table) {
    errors.push('docs/APP_PILLARS.md is out of date. Run: node scripts/check-app-pillars.mjs --write')
  }
  if (errors.length) {
    console.error(`app:pillars: ${errors.length} problem(s):\n`)
    for (const e of errors) console.error(`  ${e}`)
    process.exit(1)
  }
  const open = rows.reduce((n, r) => n + PILLARS.filter((p) => r.cells[p] === 'gap').length, 0)
  console.log(`app:pillars: ${rows.length} apps checked, ${open} open gap(s), every gap has a reason.`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
