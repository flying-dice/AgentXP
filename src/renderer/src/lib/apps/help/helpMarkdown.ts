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
import { topicOfHref } from './helpModel'

export const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** The slug of a heading: lowercase words joined with `-`. */
export const slugOf = (text: string): string =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')

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
      if (topic) return `<a href="${escapeHtml(topic)}.md" data-topic="${escapeHtml(topic)}" data-testid="help-link">${inner}</a>`
      if (href.startsWith('#')) return `<a href="${escapeHtml(href)}" data-anchor="${escapeHtml(href.slice(1))}">${inner}</a>`
      return `<span class="external">${inner} (${escapeHtml(href)})</span>`
    },
    code({ text, lang }: Tokens.Code): string {
      const language = (lang ?? '').split(/\s+/)[0]
      return `<pre data-lang="${escapeHtml(language)}"><code>${escapeHtml(text)}</code></pre>\n`
    }
  }
})

/** Markdown to HTML that is safe to put in the page with `{@html}`. */
export const renderHelpMarkdown = (source: string): string => marked.parse(source, { async: false })
