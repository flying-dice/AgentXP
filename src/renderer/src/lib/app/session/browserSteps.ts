/**
 * What the agent did in the Browser, in plain words. A turn that only used `browser_*` tools folds into one line
 * ("Used 28 steps in the browser (read, clicked, typed)") with its first and last step ("Opened the chat page", "Typed in 'Message'"), so a
 * person can answer "what did it do there" without opening Details. Tool names and element numbers stay in Details.
 */
import type { WorkRow } from './transcriptRows'

type Input = Record<string, unknown>

const BROWSER_TOOL = /(?:^|[.\s]|__)(browser_[a-z]+)(?![a-z_])/

/** `agent7.browser_click` and `mcp__agent7__browser_click` give `browser_click`; any other tool gives null. */
export function browserToolName(name: string): string | null {
  return BROWSER_TOOL.exec(name.trim())?.[1] ?? null
}

function parse(rawInput: string | null): Input {
  if (!rawInput) return {}
  try {
    const parsed: unknown = JSON.parse(rawInput)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Input) : {}
  } catch {
    return {}
  }
}

const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null)

const SHORT = 40
const shorten = (text: string): string => (text.length > SHORT ? `${text.slice(0, SHORT - 1).trimEnd()}…` : text)

/** "localhost:3000/chat" for "http://localhost:3000/chat?x=1"; the text itself when it is not a web address. */
function pageOf(url: string): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname === '/' ? '' : parsed.pathname
    return shorten(`${parsed.host}${path}`)
  } catch {
    return shorten(url)
  }
}

/**
 * What the tool result names as the target: "Clicked the button 'Send' [6]." gives "the button 'Send'", "Typed into 'Message' [7]."
 * gives "'Message'". Null when the result names none (an old result, a failed call, or an element with no name).
 */
export function resultTarget(result: string | null | undefined, verbs: string): string | null {
  const target = new RegExp(`^(?:${verbs}) (.+?) \\[\\d+\\]`).exec(result?.trim() ?? '')?.[1]
  return target && target !== 'an item on the page' ? target : null
}

/** One step of the Browser in the past tense ("Read the page"), or null for a tool that is not a Browser tool. `result` is the text the tool gave back; it names the target of a click or of typing. */
export function browserStep(name: string, rawInput: string | null, result: string | null = null): string | null {
  const tool = browserToolName(name)
  if (!tool) return null
  const input = parse(rawInput)
  switch (tool) {
    case 'browser_navigate': {
      const url = str(input.url)
      return url ? `Opened ${pageOf(url)}` : 'Opened a web page'
    }
    case 'browser_read':
      return 'Read the page'
    case 'browser_find': {
      const text = str(input.text) ?? str(input.name)
      return text ? `Looked for "${shorten(text)}" on the page` : 'Looked for something on the page'
    }
    case 'browser_screenshot':
      return 'Took a picture of the page'
    case 'browser_click': {
      const target = resultTarget(result, 'Clicked|Double-clicked')
      return target ? `Clicked ${target}` : 'Clicked on the page'
    }
    case 'browser_type': {
      const target = resultTarget(result, 'Typed into')
      return target ? `Typed in ${target}` : 'Typed on the page'
    }
    case 'browser_press': {
      const key = str(input.key)
      return key ? `Pressed ${key}` : 'Pressed a key on the page'
    }
    case 'browser_scroll':
      return 'Scrolled the page'
    case 'browser_wait':
      return 'Waited for the page'
    case 'browser_select':
      return 'Chose an item on the page'
    case 'browser_tabs':
      return 'Managed the tabs of the browser'
    case 'browser_back':
      return 'Went back one page'
    case 'browser_forward':
      return 'Went forward one page'
    case 'browser_reload':
      return 'Reloaded the page'
    default:
      return 'Used the Browser'
  }
}

/** Runs of the same step become one: ['Read the page', 'Read the page'] gives ['Read the page 2 times']. */
export function coalesceSteps(steps: readonly string[]): string[] {
  const out: { text: string; times: number }[] = []
  for (const text of steps) {
    const last = out.at(-1)
    if (last?.text === text) last.times += 1
    else out.push({ text, times: 1 })
  }
  return out.map((s) => (s.times > 1 ? `${s.text} ${s.times} times` : s.text))
}

/** What each Browser tool did, as a past-tense verb for the counts ("clicked", "typed", "read"). Tools that share a word share a count. */
const KIND_WORD: Record<string, string> = {
  browser_navigate: 'opened',
  browser_tabs: 'opened',
  browser_back: 'opened',
  browser_forward: 'opened',
  browser_reload: 'opened',
  browser_read: 'read',
  browser_find: 'read',
  browser_screenshot: 'read',
  browser_click: 'clicked',
  browser_select: 'clicked',
  browser_type: 'typed',
  browser_press: 'typed',
  browser_scroll: 'scrolled',
  browser_wait: 'waited'
}

/** How many steps of each kind, most frequent first (ties keep the order of first use): [['read', 24], ['typed', 1]]. */
export function stepKinds(toolNames: readonly string[]): [string, number][] {
  const counts = new Map<string, number>()
  for (const name of toolNames) {
    const word = KIND_WORD[browserToolName(name) ?? ''] ?? 'used'
    counts.set(word, (counts.get(word) ?? 0) + 1)
  }
  return [...counts].sort((a, b) => b[1] - a[1])
}

const SUMMARY_KINDS = 3

export interface BrowserWork {
  /** "Used 28 steps in the browser (read, clicked, typed)". */
  summary: string
  /** The counts per kind for the tooltip: "Read 24 times, clicked 2 times, typed 1 time". */
  tooltip: string
  /** "First: Opened the chat page. Last: Typed on the page."; null for a single step. */
  detail: string | null
}

/** The summary of a group whose tools are all Browser tools; null when it has no tool or any other tool. */
export function browserWork(rows: readonly WorkRow[]): BrowserWork | null {
  const tools = rows.filter((r): r is Extract<WorkRow, { kind: 'tool' }> => r.kind === 'tool')
  if (tools.length === 0) return null
  const steps: string[] = []
  for (const tool of tools) {
    const step = browserStep(tool.name, tool.rawInput, tool.result)
    if (step === null) return null
    steps.push(step)
  }
  const shown = coalesceSteps(steps)
  const kinds = stepKinds(tools.map((t) => t.name))
  const times = (n: number): string => `${n} ${n === 1 ? 'time' : 'times'}`
  return {
    summary: `Used ${steps.length} ${steps.length === 1 ? 'step' : 'steps'} in the browser (${kinds.slice(0, SUMMARY_KINDS).map(([word]) => word).join(', ')})`,
    tooltip: kinds.map(([word, n], i) => `${i === 0 ? word[0].toUpperCase() + word.slice(1) : word} ${times(n)}`).join(', '),
    detail: steps.length > 1 ? `First: ${shown[0]}. Last: ${shown.at(-1)}.` : null
  }
}
