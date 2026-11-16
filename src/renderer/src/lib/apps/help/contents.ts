/**
 * The Table of Contents of a manual lists every chapter with all its sections, which is a long list above the answer.
 * It shows the sections of the current chapter only; the other chapters stay one line each (UX-132).
 */

/** The class on the chapter lines whose sections are hidden. */
export const COLLAPSED_CLASS = 'toc-collapsed'

/** The id of the chapter (the `##` heading) a heading belongs to: itself when it is one, else the nearest one before it. */
export function chapterOf(headings: readonly { tag: string; id: string }[], id: string): string | null {
  let chapter: string | null = null
  for (const h of headings) {
    if (h.tag.toLowerCase() === 'h2') chapter = h.id
    if (h.id === id) return chapter
  }
  return null
}

/** Space above a heading that a jump scrolls to, in px: the text above it is out of sight, not cut in half (UX-183). */
export const HEADING_GAP = 8

/** How far to scroll a box so that a heading (px from the top of its content) has `HEADING_GAP` above it. */
export const scrollTopFor = (headingTop: number): number => Math.max(0, Math.round(headingTop - HEADING_GAP))

/** Which chapter lines of the contents hide their sections: every line that has some, except the open chapter. */
export const collapsedLines = (lines: readonly { id: string | null; hasSections: boolean }[], open: string | null): boolean[] =>
  lines.map((l) => l.hasSections && !(l.id !== null && l.id === open))

/** Collapses the Table of Contents of an article to the chapter of `headingId` (none open when it is null). Safe when there is no contents. */
export function collapseContents(article: ParentNode, headingId: string | null): void {
  const heading = article.querySelector('h2#table-of-contents')
  let list: Element | null = heading?.nextElementSibling ?? null
  while (list && list.tagName !== 'UL') list = list.nextElementSibling
  if (!list) return
  const ids = [...article.querySelectorAll('h2[id], h3[id], h4[id]')].map((h) => ({ tag: h.tagName, id: h.id }))
  const open = headingId ? chapterOf(ids, headingId) : null
  const items = [...list.children]
  const lines = items.map((item) => ({ id: item.querySelector(':scope > a')?.getAttribute('href')?.replace(/^#/, '') ?? null, hasSections: item.querySelector(':scope > ul') !== null }))
  const hidden = collapsedLines(lines, open)
  items.forEach((item, i) => {
    item.classList.toggle(COLLAPSED_CLASS, hidden[i])
    // Test ids for the lines that have sections: shown (open) or hidden.
    if (lines[i].hasSections) item.setAttribute('data-testid', hidden[i] ? 'help-toc-collapsed' : 'help-toc-open')
  })
}
