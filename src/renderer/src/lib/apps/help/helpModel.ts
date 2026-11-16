/**
 * Help and Support: the topics (one per file of `docs/help`), the topic of an app, the topic search and the
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

/** Topics in reading order: Home, the desktop, the launcher, the apps in the order of `APP_KINDS`, the rest by name. */
const ORDER: readonly string[] = [HOME_TOPIC, DESKTOP_TOPIC, 'launcher', ...APP_KINDS, 'help']

const orderOf = (id: string): number => {
  const at = ORDER.indexOf(id)
  return at === -1 ? ORDER.length : at
}

/** The topic F1 opens for the focused window; a desktop without a focused window gets the desktop topic. */
export const topicForApp = (app: AppKind | null | undefined): string => (app ? app : DESKTOP_TOPIC)

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

/**
 * Topics that contain every word of the query (case-insensitive) in the title or the text.
 * A topic with the words in the title comes first. An empty query keeps all topics in order.
 */
export function searchTopics(topics: readonly HelpTopic[], query: string): HelpTopic[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return [...topics]
  const hits: { topic: HelpTopic; inTitle: boolean; at: number }[] = []
  topics.forEach((topic, at) => {
    const title = topic.title.toLowerCase()
    const all = `${title} ${plainText(topic.body).toLowerCase()}`
    if (words.every((w) => all.includes(w))) hits.push({ topic, inTitle: words.every((w) => title.includes(w)), at })
  })
  return hits.sort((a, b) => Number(b.inTitle) - Number(a.inTitle) || a.at - b.at).map((h) => h.topic)
}

/**
 * The topic a link inside an article points to: `notepad.md` and `./notepad.md#the-window` give `notepad`.
 * Other links (web addresses, `#anchors`, other file types) give null.
 */
export function topicOfHref(href: string): string | null {
  const match = /^(?:\.\/)?([a-z0-9-]+)\.md(?:#.*)?$/i.exec(href.trim())
  return match ? match[1].toLowerCase() : null
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
