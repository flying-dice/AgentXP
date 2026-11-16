/**
 * What the agent did in the Browser, in plain words. A turn that only used `browser_*` tools folds into one line
 * ("Worked in the Browser: 28 steps") with its first and last step ("Opened the chat page", "Typed on the page"), so a
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

/** One step of the Browser in the past tense ("Read the page"), or null for a tool that is not a Browser tool. */
export function browserStep(name: string, rawInput: string | null): string | null {
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
    case 'browser_click':
      return 'Clicked on the page'
    case 'browser_type':
      return 'Typed on the page'
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

export interface BrowserWork {
  /** "Worked in the Browser: 28 steps". */
  summary: string
  /** "First: Opened the chat page. Last: Typed on the page."; null for a single step. */
  detail: string | null
}

/** The summary of a group whose tools are all Browser tools; null when it has no tool or any other tool. */
export function browserWork(rows: readonly WorkRow[]): BrowserWork | null {
  const tools = rows.filter((r): r is Extract<WorkRow, { kind: 'tool' }> => r.kind === 'tool')
  if (tools.length === 0) return null
  const steps: string[] = []
  for (const tool of tools) {
    const step = browserStep(tool.name, tool.rawInput)
    if (step === null) return null
    steps.push(step)
  }
  const shown = coalesceSteps(steps)
  return {
    summary: `Worked in the Browser: ${steps.length} ${steps.length === 1 ? 'step' : 'steps'}`,
    detail: steps.length > 1 ? `First: ${shown[0]}. Last: ${shown.at(-1)}.` : null
  }
}
