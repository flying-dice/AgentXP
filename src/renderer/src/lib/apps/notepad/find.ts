/**
 * The start of the next match of `query` in `text`, looking from offset `from` and going on from the top when there is none
 * below (Notepad's Find Next). Returns -1 when the text does not contain the query at all.
 */
export function findNext(text: string, query: string, from: number, matchCase: boolean): number {
  if (query === '') return -1
  const hay = matchCase ? text : text.toLowerCase()
  const needle = matchCase ? query : query.toLowerCase()
  const start = Math.max(0, Math.min(from, hay.length))
  const below = hay.indexOf(needle, start)
  return below >= 0 ? below : hay.indexOf(needle)
}
