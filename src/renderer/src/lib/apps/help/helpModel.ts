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

/**
 * The section each app's manual opens at when F1 or View Help asks for it: the heading of the section (its slug, with or
 * without the number the manuals put in front). An app without an entry opens at the top of its manual. Every app manual
 * has "Common Tasks", the section that answers "how do I...", so that is where F1 lands.
 */
export const HELP_ANCHORS: Partial<Record<AppKind, string>> = Object.fromEntries(APP_KINDS.map((kind) => [kind, 'common-tasks']))

/** The topic F1 opens for the focused window, with the app's help anchor ("notepad#common-tasks"); a desktop without a focused window gets the keyboard topic. */
export function topicForApp(app: AppKind | null | undefined): string {
  if (!app) return KEYBOARD_TOPIC
  const anchor = HELP_ANCHORS[app]
  return anchor ? `${app}#${anchor}` : app
}

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

/** One part of a manual: the introduction under the title (`section` empty) or one section under a heading. */
export interface HelpSection {
  topic: HelpTopic
  /** The heading of the section (empty for the introduction of the topic). */
  section: string
  /** The slug of `section`, the `id` of its heading in the article. */
  sectionId: string
  /** The plain words under the heading, up to the next heading. */
  text: string
}

/** Headings that only list or point elsewhere: a search never lands on them. */
const SKIPPED_SECTIONS = new Set(['table-of-contents'])

/** Cuts a topic into its introduction and its sections (the `##` to `####` headings; code blocks are left out). */
export function sectionsOf(topic: HelpTopic): HelpSection[] {
  const sections: HelpSection[] = []
  let current: { section: string; lines: string[] } = { section: '', lines: [] }
  const close = (): void => {
    const sectionId = current.section ? slugOf(current.section) : ''
    if (!SKIPPED_SECTIONS.has(sectionId)) sections.push({ topic, section: current.section, sectionId, text: plainText(current.lines.join('\n')) })
  }
  let inCode = false
  for (const line of topic.body.split(/\r?\n/)) {
    if (/^```/.test(line)) inCode = !inCode
    if (inCode) continue
    const heading = /^#{2,4}\s+(.+?)\s*#*$/.exec(line)
    if (heading) {
      close()
      current = { section: heading[1].trim(), lines: [] }
    } else if (!/^#\s/.test(line)) current.lines.push(line)
  }
  close()
  return sections
}

/** The sections of every topic, in reading order. Built once per list of topics. */
const indexes = new WeakMap<readonly HelpTopic[], HelpSection[]>()
export function indexSections(topics: readonly HelpTopic[]): HelpSection[] {
  let index = indexes.get(topics)
  if (!index) {
    index = topics.flatMap(sectionsOf)
    indexes.set(topics, index)
  }
  return index
}

/** One search result: the section where the words are, its topic and a line of text around the words. */
export interface HelpHit {
  topic: HelpTopic
  /** The heading of the section that holds the match (empty for the top of the topic). */
  section: string
  /** The slug of `section`, the `id` of its heading in the article. */
  sectionId: string
  snippet: string
}

const SNIPPET_AROUND = 70

/** A short line of the section text around the first of the words; the start of the text when only the heading matches. */
export function snippetOf(text: string, words: readonly string[]): string {
  const lower = text.toLowerCase()
  const found = words.map((w) => lower.indexOf(w)).filter((i) => i >= 0)
  if (found.length === 0) return text.slice(0, SNIPPET_AROUND * 2).trim()
  const first = Math.min(...found)
  const from = Math.max(0, first - SNIPPET_AROUND)
  const to = Math.min(text.length, first + SNIPPET_AROUND)
  return `${from > 0 ? '...' : ''}${text.slice(from, to).trim()}${to < text.length ? '...' : ''}`
}

interface ScoredSection {
  hit: HelpSection
  /** Every word is in the heading of the section (the title of the topic for its introduction). */
  inHeading: boolean
  /** Every word is in the title of the topic and the heading together. */
  inName: boolean
  matched: number
  at: number
}

/**
 * The sections that contain every word of the query (case-insensitive, stop words left out), the best first: a section
 * with the words in its heading comes before one that has them only in its text, then the topic of the app that was
 * focused when Help opened (UX-81), then the order of the manuals. When no section has every word, the sections that have
 * at least half of the words follow. An empty query gives no sections.
 */
export function searchSections(topics: readonly HelpTopic[], query: string, preferred?: string): HelpHit[] {
  const words = queryWords(query)
  if (words.length === 0) return []
  const scored = indexSections(topics).map((hit, at): ScoredSection => {
    const heading = (hit.section || hit.topic.title).toLowerCase()
    const name = `${hit.topic.title} ${hit.section}`.toLowerCase()
    const all = `${name} ${hit.text.toLowerCase()}`
    return { hit, inHeading: words.every((w) => heading.includes(w)), inName: words.every((w) => name.includes(w)), matched: words.filter((w) => all.includes(w)).length, at }
  })
  const full = scored.filter((s) => s.matched === words.length)
  const hits = full.length > 0 || words.length < 2 ? full : scored.filter((s) => s.matched >= Math.ceil(words.length / 2))
  const first = (s: ScoredSection): number => (preferred !== undefined && s.hit.topic.id === preferred ? 0 : 1)
  return hits
    .sort((a, b) => Number(b.inHeading) - Number(a.inHeading) || Number(b.inName) - Number(a.inName) || b.matched - a.matched || first(a) - first(b) || a.at - b.at)
    .map(({ hit }) => ({ topic: hit.topic, section: hit.section, sectionId: hit.sectionId, snippet: snippetOf(hit.text, words) }))
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
