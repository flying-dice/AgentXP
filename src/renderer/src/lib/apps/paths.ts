/**
 * Path helpers of the apps. Workspace paths are relative to the desktop's folder, use `/` and
 * have no leading slash (`''` is the folder itself). The user sees them as `W:\src\auth`.
 */

/** Normalises separators, drops `.` segments and leading or trailing slashes. */
export function normalizePath(path: string): string {
  const parts: string[] = []
  for (const part of path.replaceAll('\\', '/').split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

export const baseName = (path: string): string => normalizePath(path).split('/').pop() ?? ''

export function parentOf(path: string): string {
  const parts = normalizePath(path).split('/').filter(Boolean)
  parts.pop()
  return parts.join('/')
}

export const joinPath = (dir: string, name: string): string => normalizePath(`${dir}/${name}`)

export function extensionOf(path: string): string {
  const name = baseName(path)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

/** `src/auth` becomes `W:\src\auth`, `''` becomes `W:\`. */
export const toWindowsPath = (path: string): string => `W:\\${normalizePath(path).replaceAll('/', '\\')}`

/**
 * Parses what the user typed in an address bar: `W:\src\auth`, `W:/src`, `src/auth` or `\src`.
 * Returns the relative workspace path, or null for another drive.
 */
export function parseAddress(text: string): string | null {
  const trimmed = text.trim()
  const drive = /^([a-z]):/i.exec(trimmed)
  if (drive && drive[1].toUpperCase() !== 'W') return null
  return normalizePath(drive ? trimmed.slice(2) : trimmed)
}

const NOTEPAD_EXTENSIONS = new Set(['txt', 'md', 'log', 'markdown', 'text'])

/** Files Explorer opens in Notepad; everything else opens in Code. */
export const opensInNotepad = (path: string): boolean => NOTEPAD_EXTENSIONS.has(extensionOf(path))

/** Human type name of a file for the Explorer's Type column. */
export function typeName(path: string, isDirectory: boolean): string {
  if (isDirectory) return 'File folder'
  const ext = extensionOf(path)
  const names: Record<string, string> = {
    ts: 'TypeScript file',
    tsx: 'TypeScript React file',
    js: 'JavaScript file',
    mjs: 'JavaScript file',
    json: 'JSON file',
    md: 'Markdown document',
    txt: 'Text Document',
    log: 'Text Document',
    svelte: 'Svelte component',
    css: 'Cascading Style Sheet',
    html: 'HTML document',
    yml: 'YAML file',
    yaml: 'YAML file',
    png: 'PNG image',
    svg: 'SVG image'
  }
  return names[ext] ?? (ext ? `${ext.toUpperCase()} file` : 'File')
}
