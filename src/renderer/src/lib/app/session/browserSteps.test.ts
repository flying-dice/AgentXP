import { describe, expect, it } from 'vitest'
import { browserNow, browserStep, browserToolName, browserWork, coalesceSteps, stepKinds } from './browserSteps'
import type { WorkRow } from './transcriptRows'

const tool = (name: string, rawInput = '{}', id = name): WorkRow => ({ kind: 'tool', id, toolCallId: id, name, rawInput, result: null })

describe('browserToolName', () => {
  it('finds a Browser tool under the names an agent gives it', () => {
    expect(browserToolName('browser_click')).toBe('browser_click')
    expect(browserToolName('agent7.browser_read')).toBe('browser_read')
    expect(browserToolName('mcp__agent7__browser_navigate')).toBe('browser_navigate')
    expect(browserToolName('terminal_run')).toBeNull()
    expect(browserToolName('my_browser_thing')).toBeNull()
  })
})

describe('browserStep', () => {
  it('words each step in the past tense without element numbers or tool names', () => {
    expect(browserStep('browser_navigate', '{"url":"http://localhost:3000/chat?x=1"}')).toBe('Opened localhost:3000/chat')
    expect(browserStep('browser_navigate', '{}')).toBe('Opened a web page')
    expect(browserStep('browser_read', '{"mode":"tree"}')).toBe('Read the page')
    expect(browserStep('browser_click', '{"ref":12}')).toBe('Clicked on the page')
    expect(browserStep('browser_type', '{"ref":7,"text":"secret"}')).toBe("Typed 'secret' on the page")
    expect(browserStep('browser_find', '{"text":"Send"}')).toBe('Looked for "Send" on the page')
    expect(browserStep('browser_press', '{"key":"Enter"}')).toBe('Pressed Enter')
    expect(browserStep('fs.read_text_file', '{}')).toBeNull()
  })
  it('names the target of a click or of typing from the tool result (UX-157)', () => {
    expect(browserStep('browser_click', '{"ref":12}', "Clicked the button 'Send' [12]. Now at http://x/ (\"X\").")).toBe("Clicked the button 'Send'")
    expect(browserStep('browser_click', '{"ref":12}', "Double-clicked the link 'More' [12]. Now at http://x/ (\"X\").")).toBe("Clicked the link 'More'")
    expect(browserStep('browser_type', '{"ref":7,"text":"Standup"}', "Typed into 'search messages' [7]. Now at http://x/ (\"X\").")).toBe("Typed 'Standup' in the search messages box")
    expect(browserStep('browser_type', '{"ref":7,"text":"hi"}', "Typed into 'Message box' [7]. Now at http://x/ (\"X\").")).toBe("Typed 'hi' in the Message box")
    expect(browserStep('browser_type', '{"ref":7,"text":"hi"}', "Typed into a text box [7]. Now at http://x/ (\"X\").")).toBe("Typed 'hi' in a text box")
    // no name, an old result or a failed call: the general words
    expect(browserStep('browser_click', '{"ref":12}', 'Clicked an item on the page [12]. Now at x.')).toBe('Clicked on the page')
    expect(browserStep('browser_click', '{"ref":12}', 'Clicked [12]. Now at x.')).toBe('Clicked on the page')
    expect(browserStep('browser_type', '{"ref":7}', null)).toBe('Typed on the page')
    expect(browserStep('agent7.browser_press', '{"keys":"Enter"}')).toBe('Pressed Enter')
  })
})

describe('coalesceSteps', () => {
  it('joins runs of the same step', () => {
    expect(coalesceSteps(['Opened a', 'Read the page', 'Read the page', 'Read the page', 'Clicked on the page'])).toEqual(['Opened a', 'Read the page 3 times', 'Clicked on the page'])
  })
})

describe('browserWork', () => {
  it('summarises a group of Browser tools with its first and last step', () => {
    const rows = [tool('browser_navigate', '{"url":"http://localhost:3000/chat"}', 'a'), ...Array.from({ length: 24 }, (_, i) => tool('browser_read', '{}', `r${i}`)), tool('browser_type', '{"ref":3,"text":"hi"}', 'z')]
    expect(browserWork(rows)).toEqual({ summary: 'Used 26 steps in the browser (read, opened, typed)', tooltip: 'Read 24 times, opened 1 time, typed 1 time', detail: "First: Opened localhost:3000/chat. Last: Typed 'hi' on the page." })
  })
  it('says "step" for one and has no detail', () => {
    expect(browserWork([tool('browser_read')])).toEqual({ summary: 'Used 1 step in the browser (read)', tooltip: 'Read 1 time', detail: null })
  })
  it('is null when any other tool is mixed in, or there is no tool', () => {
    expect(browserWork([tool('browser_read'), tool('terminal_run')])).toBeNull()
    expect(browserWork([{ kind: 'reasoning', id: 'x', text: 'hmm' }])).toBeNull()
  })
})

describe('stepKinds', () => {
  it('counts steps by what they did, most frequent first', () => {
    expect(stepKinds(['browser_click', 'browser_read', 'browser_find', 'browser_type', 'browser_click', 'browser_click'])).toEqual([['clicked', 3], ['read', 2], ['typed', 1]])
  })
})

describe('browserNow', () => {
  it('words a running step in the present tense, never with a tool id', () => {
    expect(browserNow('agent7.browser_type', '{"ref":7,"text":"Standup"}')).toBe("Typing 'Standup'")
    expect(browserNow('agent7.browser_type', '{"ref":7}')).toBe('Typing into a text box')
    expect(browserNow('mcp__agent7__browser_read', '{}')).toBe('Reading the page')
    expect(browserNow('agent7.browser_click', '{"ref":2}')).toBe('Clicking an item on the page')
    expect(browserNow('agent7.browser_navigate', '{"url":"http://localhost:3000/chat"}')).toBe('Opening localhost:3000/chat')
    expect(browserNow('fs.read_text_file', '{}')).toBeNull()
    for (const tool of ['navigate', 'read', 'find', 'screenshot', 'click', 'type', 'press', 'scroll', 'wait', 'select', 'tabs', 'back', 'forward', 'reload', 'other']) {
      expect(browserNow(`agent7.browser_${tool}`, '{}')).not.toMatch(/browser_|agent7/)
    }
  })
})
