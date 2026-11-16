/** Pure checks of a file name typed into a Save As box. */

/** True when the name is not empty and has none of the characters Windows does not allow in a file name. */
export function isValidFileName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length > 0 && !/[\\/:*?"<>|]/.test(trimmed)
}

export const INVALID_FILE_NAME_TEXT = 'The file name is not valid.'
