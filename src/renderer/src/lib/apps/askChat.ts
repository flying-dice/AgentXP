/**
 * "Ask chat about this": the prompt a request becomes and the folder the chat works in. Pure, so the format
 * is tested. `DesktopController.askChat` sends the prompt in the window's chat pane (the draft for "Ask chat...");
 * the folder is for "Open in Chat window".
 */
import { APP_DISPLAY_NAMES, type AppView, type AskChatRequest } from '@shared/desktop'
import { viewPath } from '@shared/desktop-views'
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

/** "lines 3 to 5" or "line 7" ("" without a range): the words of the explain message. */
export function rangePhrase(range: AskChatRequest['range']): string {
  if (!range) return ''
  return range.startLine === range.endLine ? `line ${range.startLine}` : `lines ${range.startLine} to ${range.endLine}`
}

const fileName = (path: string): string => path.split(/[\\/]/).filter(Boolean).pop() ?? path

/** "Explain lines 1 to 2 of index.ts." for a selection in a file, "Explain index.ts." for a file; null for any other request. */
function explainLead(request: AskChatRequest): string | null {
  if (request.kind !== 'explain' || !request.path || request.url) return null
  const lines = rangePhrase(request.range)
  return lines ? `Explain ${lines} of ${fileName(request.path)}.` : request.text !== undefined ? `Explain this selection from ${fileName(request.path)}.` : `Explain ${fileName(request.path)}.`
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
  send: 'Here is',
  window: 'Here is'
}

const TAIL: Record<AskChatRequest['kind'], string> = {
  explain: 'Say what it does and why, and point out anything that looks wrong.',
  ask: 'My question follows in my next message.',
  send: 'Please look at it; I will tell you what I need next.',
  window: 'Please look at it; I will tell you what I need next.'
}

/** The prompt text the chat receives. */
export function askChatPrompt(request: AskChatRequest): string {
  const lead = explainLead(request)
  const parts = [lead ? `${lead}\nFile: ${request.path}` : `${LEAD[request.kind]} ${subjectOf(request)}.`]
  if (request.text?.trim()) parts.push(fenced(request.text, request.path ? (FENCE_LANGUAGES[extensionOf(request.path)] ?? '') : ''))
  parts.push(TAIL[request.kind])
  return parts.join('\n\n')
}

/**
 * What "Ask the agent about this..." puts into the chat pane's composer: what it is about and the selected text, then a blank
 * line where the user types the question (the pane does not send it).
 */
export function askChatDraft(request: AskChatRequest): string {
  const parts = [`${LEAD.ask} ${subjectOf(request)}.`]
  if (request.text?.trim()) parts.push(fenced(request.text, request.path ? (FENCE_LANGUAGES[extensionOf(request.path)] ?? '') : ''))
  return `${parts.join('\n\n')}\n\n${request.question ?? ''}`
}

export { viewPath }

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
