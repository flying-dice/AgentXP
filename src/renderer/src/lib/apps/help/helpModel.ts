/**
 * Help and Support: the topics (one per file of `manuals`), the topic of an app, the topic search and the
 * link rules. Pure functions: `helpTopics.ts` loads the files, `HelpApp.svelte` shows them.
 */
import { APP_KINDS, type AppKind } from '@shared/desktop'

export interface HelpTopic {
  /** The file name without `.md`. */
  id: string
  /** The text of the first `# ` heading. */
  title: string
  /** The Markdown source. */
  body: string
}

/** The topic that shows first and the one F1 opens when no window has focus. */
export const HOME_TOPIC = 'index'
export const DESKTOP_TOPIC = 'desktop'
/** The topic F1 opens on the desktop when no app has the focus: the keys that work everywhere (UX-81). */
export const KEYBOARD_TOPIC = 'keyboard'

/** Topics in reading order: Home, the desktop, the launcher, the apps in the order of `APP_KINDS`, the rest by name. */
/** The task topics that are not about one app, after the app manuals. */
export const TASK_TOPICS: readonly string[] = ['keyboard', 'agent-does-not-start', 'projects', 'approvals', 'pause-stop-resume']

const ORDER: readonly string[] = [HOME_TOPIC, DESKTOP_TOPIC, 'launcher', ...APP_KINDS, 'help', ...TASK_TOPICS]

const orderOf = (id: string): number => {
  const at = ORDER.indexOf(id)
  return at === -1 ? ORDER.length : at
}

/** The slug of a heading: lowercase words joined with `-` (the `id` of the heading in the article). */
export const slugOf = (text: string): string =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')

/** The topic F1 opens for the focused window; a desktop without a focused window gets the keyboard topic. */
export const topicForApp = (app: AppKind | null | undefined): string => (app ? app : KEYBOARD_TOPIC)

/**
 * A topic with a section: `browser#troubleshooting` is the topic `browser` scrolled to its heading
 * `troubleshooting` (the slug of the heading). Without `#` the section is empty.
 */
export function splitTopic(value: string): { topic: string; section: string } {
  const at = value.indexOf('#')
  return at < 0 ? { topic: value, section: '' } : { topic: value.slice(0, at), section: value.slice(at + 1) }
}

/** The first `# ` heading of a Markdown text, else the fallback. */
export function titleOf(markdown: string, fallback: string): string {
  const match = /^#\s+(.+?)\s*#*\s*$/m.exec(markdown)
  return match ? match[1].trim() : fallback
}

/** Builds the topic list from the raw files (`path -> Markdown`). The id is the file name without `.md`. */
export function parseTopics(files: Record<string, string>): HelpTopic[] {
  return Object.entries(files)
    .map(([path, body]) => {
      const id = (path.split(/[\\/]/).pop() ?? path).replace(/\.md$/i, '')
      return { id, title: titleOf(body, id), body }
    })
    .sort((a, b) => orderOf(a.id) - orderOf(b.id) || a.id.localeCompare(b.id))
}

/** The Markdown as plain words, for the search (no marks, no link targets). */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Words that say nothing about the topic: a search ignores them ("page stays blank" looks for "page" and "blank"). */
const STOP_WORDS = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'does', 'do', 'not', 'no', 'my', 'to', 'of', 'in', 'on', 'it', 'i', 'and', 'or', 'stay', 'stays', 'how', 'can'])

/** The words of a search: lower case, without stop words (all words when the query has nothing else). */
export function queryWords(query: string): string[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const meaningful = words.filter((w) => !STOP_WORDS.has(w))
  return meaningful.length > 0 ? meaningful : words
}

interface Scored {
  topic: HelpTopic
  inTitle: boolean
  matched: number
  at: number
}

function score(topics: readonly HelpTopic[], words: readonly string[]): Scored[] {
  return topics.map((topic, at) => {
    const title = topic.title.toLowerCase()
    const all = `${title} ${plainText(topic.body).toLowerCase()}`
    return { topic, inTitle: words.every((w) => title.includes(w)), matched: words.filter((w) => all.includes(w)).length, at }
  })
}

/**
 * Topics that contain every word of the query (case-insensitive, stop words left out) in the title or the text.
 * A topic with the words in the title comes first. When no topic has every word, the topics that have at least half of
 * the words follow, the best first. An empty query keeps all topics in order.
 */
export function searchTopics(topics: readonly HelpTopic[], query: string, preferred?: string): HelpTopic[] {
  const words = queryWords(query)
  if (words.length === 0) return [...topics]
  const scored = score(topics, words)
  const all = scored.filter((s) => s.matched === words.length)
  const hits = all.length > 0 || words.length < 2 ? all : scored.filter((s) => s.matched >= Math.ceil(words.length / 2))
  // The topic of the app that was focused when Help opened comes first (UX-81).
  const first = (s: Scored): number => (preferred !== undefined && s.topic.id === preferred ? 0 : 1)
  return hits.sort((a, b) => first(a) - first(b) || Number(b.inTitle) - Number(a.inTitle) || b.matched - a.matched || a.at - b.at).map((h) => h.topic)
}

/** One search result: the topic, the section where the words are, and a line of text around them. */
export interface HelpHit {
  topic: HelpTopic
  /** The heading of the section that holds the match (empty for the top of the topic). */
  section: string
  /** The slug of `section`, the `id` of its heading in the article. */
  sectionId: string
  snippet: string
}

const SNIPPET_AROUND = 70

/** The first line of the topic that has the most of the words, with the heading above it and a short snippet. */
export function locate(topic: HelpTopic, words: readonly string[]): { section: string; sectionId: string; snippet: string } {
  let heading = ''
  let best = { count: 0, section: '', text: '' }
  let inCode = false
  for (const line of topic.body.split(/\r?\n/)) {
    if (/^```/.test(line)) inCode = !inCode
    if (inCode) continue
    const h = /^#{2,4}\s+(.+?)\s*#*$/.exec(line)
    if (h) {
      heading = h[1].trim()
      continue
    }
    const text = plainText(line)
    const lower = text.toLowerCase()
    const count = words.filter((w) => lower.includes(w)).length
    if (count > best.count) best = { count, section: heading, text }
  }
  if (best.count === 0) return { section: '', sectionId: '', snippet: plainText(topic.body).slice(0, SNIPPET_AROUND * 2) }
  const lower = best.text.toLowerCase()
  const first = Math.min(...words.map((w) => lower.indexOf(w)).filter((i) => i >= 0))
  const from = Math.max(0, first - SNIPPET_AROUND)
  const to = Math.min(best.text.length, first + SNIPPET_AROUND)
  const snippet = `${from > 0 ? '...' : ''}${best.text.slice(from, to).trim()}${to < best.text.length ? '...' : ''}`
  return { section: best.section, sectionId: best.section ? slugOf(best.section) : '', snippet }
}

/** The results of a search with their section and snippet (same order as `searchTopics`). */
export function searchHits(topics: readonly HelpTopic[], query: string, preferred?: string): HelpHit[] {
  const words = queryWords(query)
  return searchTopics(topics, query, preferred).map((topic) => ({ topic, ...locate(topic, words) }))
}

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Wraps each of the words in `<mark>` in the text of an HTML string (not inside tags or character references). */
export function markWords(html: string, words: readonly string[]): string {
  const list = words.filter((w) => w.length > 0)
  if (list.length === 0) return html
  const pattern = new RegExp(`(${list.map(escapeRegExp).join('|')})`, 'gi')
  return html
    .split(/(<[^>]*>|&#?[a-z0-9]+;)/i)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(pattern, '<mark>$1</mark>')))
    .join('')
}

/**
 * The topic a link inside an article points to: `notepad.md` and `./notepad.md#the-window` give `notepad`.
 * Other links (web addresses, `#anchors`, other file types) give null.
 */
export function topicOfHref(href: string): string | null {
  const match = /^(?:\.\/)?([a-z0-9-]+)\.md(?:#.*)?$/i.exec(href.trim())
  return match ? match[1].toLowerCase() : null
}

/** The section a link points to: `notepad.md#saving-a-file` gives `saving-a-file`, a link without `#` gives ''. */
export function sectionOfHref(href: string): string {
  const match = /^(?:\.\/)?[a-z0-9-]+\.md#(.+)$/i.exec(href.trim())
  return match ? match[1] : ''
}

/**
 * The heading a section name points to, among the heading ids of an article: the exact id, else the id without its
 * number (`troubleshooting` finds `6-troubleshooting`, the way the manuals number their sections); null when none fits.
 */
export function resolveSection(ids: readonly string[], wanted: string): string | null {
  if (ids.includes(wanted)) return wanted
  return ids.find((id) => id.replace(/^\d+-/, '') === wanted) ?? null
}

/** Back and Forward history of the topics a window showed. */
export interface HelpHistory {
  readonly past: readonly string[]
  readonly current: string
  readonly future: readonly string[]
}

export const startHistory = (topic: string): HelpHistory => ({ past: [], current: topic, future: [] })

/** Shows another topic: the current one goes on the Back list and the Forward list is cleared. */
export function visit(history: HelpHistory, topic: string): HelpHistory {
  if (topic === history.current) return history
  return { past: [...history.past, history.current], current: topic, future: [] }
}

export function back(history: HelpHistory): HelpHistory {
  const previous = history.past.at(-1)
  if (previous === undefined) return history
  return { past: history.past.slice(0, -1), current: previous, future: [history.current, ...history.future] }
}

export function forward(history: HelpHistory): HelpHistory {
  const [next, ...rest] = history.future
  if (next === undefined) return history
  return { past: [...history.past, history.current], current: next, future: rest }
}
