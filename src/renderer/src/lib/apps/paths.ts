/**
 * Path helpers of the apps. Every path is a VPath (`E:\src\index.ts`, see `@shared/vfs`); the
 * parsing and joining lives in the shared helpers (`parseVPath`, `joinVPath`, `vpathParent`,
 * `vpathName`). This file only adds what the apps need to show: extensions and type names.
 */
import { vpathName, type VPath } from '@shared/vfs'

export function extensionOf(path: VPath): string {
  const name = vpathName(path)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

const NOTEPAD_EXTENSIONS = new Set(['txt', 'md', 'log', 'markdown', 'text'])

/** Files Explorer opens in Notepad; everything else opens in Code. */
export const opensInNotepad = (path: VPath): boolean => NOTEPAD_EXTENSIONS.has(extensionOf(path))

/** Human type name of a file for the Explorer's Type column. */
export function typeName(path: VPath, isDirectory: boolean): string {
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
