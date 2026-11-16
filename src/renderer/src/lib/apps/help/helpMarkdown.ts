/**
 * The small, safe Markdown renderer of Help and Support. It uses `marked` (already a dependency) with
 * three rules that make the output safe without a DOM:
 *   1. Raw HTML in the source is shown as text (escaped), never as markup.
 *   2. A link is a link only when it points to another help topic (`notepad.md`). Every other link
 *      (web address, `#anchor`, `javascript:`) is shown as plain text with its target in brackets.
 *   3. An image is shown as its alt text.
 * Headings get an `id` so the Table of Contents links (`#the-window`) can scroll to them.
 */
import { Marked, type Renderer, type Tokens } from 'marked'
import { sectionOfHref, slugOf, topicOfHref } from './helpModel'

export { slugOf }

export const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    html: ({ text }: Tokens.HTML | Tokens.Tag): string => escapeHtml(text),
    image: ({ text }: Tokens.Image): string => escapeHtml(text),
    heading(this: Renderer, { tokens, depth, text }: Tokens.Heading): string {
      return `<h${depth} id="${escapeHtml(slugOf(text))}">${this.parser.parseInline(tokens)}</h${depth}>\n`
    },
    link(this: Renderer, { href, tokens }: Tokens.Link): string {
      const inner = this.parser.parseInline(tokens)
      const topic = topicOfHref(href)
      if (topic) {
        const section = sectionOfHref(href)
        return `<a href="${escapeHtml(topic)}.md${section ? `#${escapeHtml(section)}` : ''}" data-topic="${escapeHtml(topic)}"${section ? ` data-section="${escapeHtml(section)}"` : ''} data-testid="help-link">${inner}</a>`
      }
      if (href.startsWith('#')) return `<a href="${escapeHtml(href)}" data-anchor="${escapeHtml(href.slice(1))}" data-testid="help-contents-link">${inner}</a>`
      return `<span class="external">${inner} (${escapeHtml(href)})</span>`
    },
    code({ text, lang }: Tokens.Code): string {
      const language = (lang ?? '').split(/\s+/)[0]
      return `<pre data-lang="${escapeHtml(language)}"><code>${escapeHtml(text)}</code></pre>\n`
    }
  }
})

const CELL_SPLIT = /(?<!\\)\|/
const isTestIdHeader = (cell: string): boolean => /^(`?data-testid`?|test ?id)$/i.test(cell.trim())
const splitRow = (line: string): string[] => line.trim().replace(/^\|/, '').replace(/\|$/, '').split(CELL_SPLIT)
const joinRow = (cells: string[]): string => `| ${cells.map((c) => c.trim()).join(' | ')} |`

/** A sentence that talks about a `data-*` attribute is for the end-to-end specs, not for the reader. */
const withoutAttributeSentences = (cell: string): string =>
  cell
    .split(/(?<=\.)\s+/)
    .filter((sentence) => !/`data-[a-z-]+`/.test(sentence))
    .join(' ')

/**
 * Takes the developer text out of a manual before it is shown (UX-45): the `data-testid` column of the Controls
 * reference tables and the sentences about `data-*` attributes. The manuals keep them (the specs and
 * `check-help-coverage` read them); the reader does not see them.
 */
export function hideTestIds(source: string): string {
  const lines = source.split('\n')
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const next = lines[i + 1] ?? ''
    if (!line.trim().startsWith('|') || !/^\s*\|?\s*:?-{2,}/.test(next)) {
      out.push(line)
      continue
    }
    const head = splitRow(line)
    const drop = head.findIndex(isTestIdHeader)
    // The whole table block.
    let end = i
    while (end < lines.length && lines[end].trim().startsWith('|')) end++
    for (let r = i; r < end; r++) {
      const cells = splitRow(lines[r])
      const kept = drop < 0 ? cells : cells.filter((_, c) => c !== drop)
      out.push(joinRow(r > i + 1 ? kept.map(withoutAttributeSentences) : kept))
    }
    i = end - 1
  }
  return out.join('\n')
}

/** The Table of Contents bullets become links to the headings with the same words (UX-44). */
export function linkContents(source: string): string {
  const lines = source.split('\n')
  const start = lines.findIndex((l) => /^##\s+table of contents\s*$/i.test(l))
  if (start < 0) return source
  const headings = new Map<string, string>()
  let inCode = false
  for (const line of lines) {
    if (/^```/.test(line)) inCode = !inCode
    const h = !inCode ? /^#{2,4}\s+(.+?)\s*#*$/.exec(line) : null
    if (h && !headings.has(h[1].trim().toLowerCase())) headings.set(h[1].trim().toLowerCase(), slugOf(h[1]))
  }
  for (let i = start + 1; i < lines.length && !/^(---|##\s)/.test(lines[i]); i++) {
    const item = /^(\s*[-*]\s+)(.+?)\s*$/.exec(lines[i])
    const slug = item && !item[2].includes('](') ? headings.get(item[2].trim().toLowerCase()) : undefined
    if (item && slug) lines[i] = `${item[1]}[${item[2]}](#${slug})`
  }
  return lines.join('\n')
}

/** Markdown to HTML that is safe to put in the page with `{@html}`. */
export const renderHelpMarkdown = (source: string): string => marked.parse(linkContents(hideTestIds(source)), { async: false })
