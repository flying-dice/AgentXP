/** Pure checks of a file name typed into a Save As box. */

/** True when the name is not empty and has none of the characters Windows does not allow in a file name. */
export function isValidFileName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length > 0 && !/[\\/:*?"<>|]/.test(trimmed)
}

export const INVALID_FILE_NAME_TEXT = 'The file name is not valid.'

/**
 * Cuts a long text in the middle, so the start and the end stay (a path keeps its drive and its last folder):
 * `shortenMiddle('/home/anna/projects/web/login-app', 20)` gives `/home/an...gin-app`.
 */
export function shortenMiddle(text: string, max: number): string {
  if (text.length <= max || max < 5) return text
  const keep = max - 3
  const tail = Math.ceil(keep / 2)
  return `${text.slice(0, keep - tail)}...${text.slice(text.length - tail)}`
}
