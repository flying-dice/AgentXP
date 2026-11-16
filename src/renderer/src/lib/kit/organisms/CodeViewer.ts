/** One version control mark of the CodeViewer gutter. */
export interface GutterMark {
  kind: 'added' | 'modified' | 'deleted'
  /** First marked line (1-based). For `deleted`: the line the red triangle sits below (0 = above line 1). */
  line: number
  /** Last marked line (= `line` for `deleted`). */
  end: number
  /** Position of the change in the caller's list; echoed back by `onmarkclick`. */
  index: number
}

const KIND_WORD: Record<GutterMark['kind'], string> = { added: 'added', modified: 'changed', deleted: 'deleted' }

/**
 * The tooltip and accessible name of a gutter mark: "Line 3: changed. Click to show the old text." (UX-39).
 * An added change has no old text, so its click shows the change.
 */
export function markTitle(mark: GutterMark): string {
  if (mark.kind === 'deleted') return `${mark.line < 1 ? 'Lines deleted above line 1' : `Lines deleted below line ${mark.line}`}. Click to show the old text.`
  const where = mark.end > mark.line ? `Lines ${mark.line} to ${mark.end}` : `Line ${mark.line}`
  return `${where}: ${KIND_WORD[mark.kind]}. Click to ${mark.kind === 'added' ? 'show the change' : 'show the old text'}.`
}
