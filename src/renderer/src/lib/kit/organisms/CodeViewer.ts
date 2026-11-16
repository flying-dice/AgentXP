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
