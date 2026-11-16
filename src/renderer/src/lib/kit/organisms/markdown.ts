import DOMPurify from 'dompurify'
import { Marked } from 'marked'
import { escapeHtml, highlighter } from './highlighter'

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    // Fenced blocks get a data-lang hook; highlightCodeBlocks() fills them in asynchronously.
    code({ text, lang }) {
      const language = (lang ?? '').split(/\s+/)[0]
      return `<pre class="xp-md-code" data-lang="${escapeHtml(language)}"><code>${escapeHtml(text)}</code></pre>\n`
    }
  }
})

/** Markdown to sanitised HTML. Browser only (DOMPurify needs a DOM). */
export const renderMarkdown = (source: string): string =>
  DOMPurify.sanitize(marked.parse(source, { async: false }), {
    ADD_ATTR: ['data-lang'],
    FORBID_TAGS: ['style', 'form', 'input', 'button'],
    FORBID_ATTR: ['style']
  })

/** Replaces the plain text of every fenced block under `root` with highlighted markup. */
export const highlightCodeBlocks = async (root: HTMLElement, isStale: () => boolean = () => false): Promise<void> => {
  const blocks = Array.from(root.querySelectorAll<HTMLElement>('pre.xp-md-code'))
  await Promise.all(
    blocks.map(async (pre) => {
      const code = pre.querySelector('code')
      const lang = pre.dataset.lang ?? ''
      if (!code || !lang) return
      const html = await highlighter.toHtml(code.textContent ?? '', lang)
      if (!isStale()) code.innerHTML = html
    })
  )
}
