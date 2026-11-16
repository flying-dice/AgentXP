/**
 * "Ask chat about this": the prompt a request becomes and the folder the chat works in. Pure, so the format
 * is tested. `DesktopController.askChat` uses both today; a chat side panel can take the same request later.
 */
import { APP_DISPLAY_NAMES, type AppView, type AskChatRequest } from '@shared/desktop'
import { parseVPath, type VPath } from '@shared/vfs'
import { extensionOf } from './paths'

const FENCE_LANGUAGES: Record<string, string> = {
  ts: 'ts',
  tsx: 'tsx',
  js: 'js',
  mjs: 'js',
  json: 'json',
  md: 'markdown',
  svelte: 'svelte',
  css: 'css',
  html: 'html',
  yml: 'yaml',
  yaml: 'yaml'
}

/** A fenced block that the text cannot break out of (the fence is longer than any backtick run inside). */
export function fenced(text: string, language = ''): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length))
  const fence = '`'.repeat(Math.max(3, longest + 1))
  return `${fence}${language}\n${text.replace(/\n$/, '')}\n${fence}`
}

/** "lines 3-5", "line 7" or "". */
export function rangeLabel(range: AskChatRequest['range']): string {
  if (!range) return ''
  return range.startLine === range.endLine ? `line ${range.startLine}` : `lines ${range.startLine}-${range.endLine}`
}

/** What the request is about, in words: the file and lines, the page, or the app. */
export function subjectOf(request: AskChatRequest): string {
  if (request.url) return `the page ${request.title ? `"${request.title}" ` : ''}at ${request.url}`
  if (request.path) {
    const lines = rangeLabel(request.range)
    return `${request.text !== undefined || lines ? 'a selection from ' : ''}${request.path}${lines ? ` (${lines})` : ''}`
  }
  return request.app === 'terminal' ? 'this Terminal output' : `this text from the ${APP_DISPLAY_NAMES[request.app]} app`
}

const LEAD: Record<AskChatRequest['kind'], string> = {
  explain: 'Please explain',
  ask: 'I have a question about',
  send: 'Here is'
}

const TAIL: Record<AskChatRequest['kind'], string> = {
  explain: 'Say what it does and why, and point out anything that looks wrong.',
  ask: 'My question follows in my next message.',
  send: 'Please look at it; I will tell you what I need next.'
}

/** The prompt text the chat receives. */
export function askChatPrompt(request: AskChatRequest): string {
  const parts = [`${LEAD[request.kind]} ${subjectOf(request)}.`]
  if (request.text?.trim()) parts.push(fenced(request.text, request.path ? (FENCE_LANGUAGES[extensionOf(request.path)] ?? '') : ''))
  parts.push(TAIL[request.kind])
  return parts.join('\n\n')
}

/** The path of a window's view, when it has one. */
export function viewPath(view: AppView): VPath | null {
  if ('path' in view && typeof view.path === 'string' && view.path) return view.path
  if (view.app === 'code') return view.activePath
  if (view.app === 'code-review') return view.root
  return null
}

/**
 * Where the chat for a request works: the drive root of its file (or of its window's file or folder) on a
 * plugged-in drive, else the desktop's home on C:.
 */
export function askChatCwd(request: AskChatRequest, windows: readonly { id: number; view: AppView }[], home: VPath): VPath {
  const source = request.path ?? (() => {
    const w = windows.find((x) => x.id === request.windowId)
    return w ? viewPath(w.view) : null
  })()
  const parsed = source ? parseVPath(source) : null
  return parsed && parsed.drive !== 'C' ? `${parsed.drive}:\\` : home
}
