import type { GitLineChange } from '@shared/git'

/** Text as lines plus whether it ends with a newline (so "a\nb" and "a\nb\n" stay different). */
function splitText(text: string): { lines: string[]; eol: boolean } {
  if (text === '') return { lines: [], eol: false }
  const eol = text.endsWith('\n')
  const lines = (eol ? text.slice(0, -1) : text).split('\n')
  return { lines, eol }
}

const joinText = (lines: string[], eol: boolean): string => (lines.length === 0 ? '' : lines.join('\n') + (eol ? '\n' : ''))

/**
 * The working text with one change replaced by its HEAD lines: an added hunk loses its lines, a modified hunk gets
 * the old lines back, a deleted hunk gets them re-inserted after line `start`. A missing final newline is restored
 * when the change reaches the end of the file.
 */
export function revertHunkText(text: string, hunk: GitLineChange): string {
  const { lines, eol } = splitText(text)
  const total = lines.length
  let reachesEnd: boolean
  if (hunk.kind === 'deleted') {
    lines.splice(hunk.start, 0, ...hunk.oldLines)
    reachesEnd = hunk.start >= total
  } else {
    lines.splice(hunk.start - 1, hunk.end - hunk.start + 1, ...hunk.oldLines)
    reachesEnd = hunk.end >= total
  }
  return joinText(lines, reachesEnd ? !hunk.noEolOld : eol)
}
