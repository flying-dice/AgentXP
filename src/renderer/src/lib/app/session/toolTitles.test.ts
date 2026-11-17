import { describe, expect, it } from 'vitest'
import { approvalTitle, plainToolTitle, toolLabel, toolPredicate, toolTitleOr, liveToolTitle } from './toolTitles'

describe('toolTitles', () => {
  it('words changes with the file', () => {
    expect(toolPredicate({ title: 'Edit src/auth/redirect.ts', toolKind: 'edit' })).toBe('change src/auth/redirect.ts')
    expect(toolPredicate({ title: 'Write file', toolKind: 'edit', path: 'E:\\src\\a.ts' })).toBe('change E:\\src\\a.ts')
    expect(toolPredicate({ title: 'Delete old.txt', toolKind: 'delete' })).toBe('delete old.txt')
    expect(toolPredicate({ title: 'Move a.ts b.ts', toolKind: 'move' })).toBe('move a.ts b.ts')
  })

  it('never shows a command, a url or a tool name in the question', () => {
    expect(toolPredicate({ title: 'Run npm test', toolKind: 'execute' })).toBe('run a command')
    expect(toolPredicate({ title: 'browser_navigate {"url":"https://x.test"}', toolKind: 'fetch' })).toBe('read the page')
    expect(toolPredicate({ title: 'read_file {"path":"a"}', toolKind: 'read' })).toBe('read a file')
    expect(toolPredicate({ title: 'desktop_open_app', toolKind: 'other' })).toBe('do something')
  })

  it('uses the agent\'s own words when no file is named', () => {
    expect(toolPredicate({ title: 'Write output', toolKind: 'edit' })).toBe('write output')
    expect(toolPredicate({ title: 'write_file {"path":"a"}', toolKind: 'edit' })).toBe('change a file')
  })

  it('keeps a plain sentence of an unknown kind', () => {
    expect(toolPredicate({ title: 'Open the Notepad app', toolKind: null })).toBe('open the Notepad app')
    expect(toolPredicate({ title: 'Install a new package', toolKind: 'other' })).toBe('install a new package')
    expect(toolPredicate({ title: '', toolKind: null })).toBe('do something')
  })

  it('builds the question and the list label', () => {
    expect(approvalTitle({ title: 'Edit src/a.ts', toolKind: 'edit' })).toBe('Allow the agent to change src/a.ts?')
    expect(approvalTitle({ title: 'Run ls', toolKind: 'execute' }, 'Claude')).toBe('Allow Claude to run a command?')
    expect(toolLabel({ title: 'Edit src/a.ts', toolKind: 'edit' })).toBe('Change src/a.ts')
  })
})


describe('plainToolTitle', () => {
  it('names the tools by what they do', () => {
    expect(plainToolTitle('fs.read_text_file')).toBe('Read a file')
    expect(plainToolTitle('fs.write_text_file')).toBe('Change a file')
    expect(plainToolTitle('terminal')).toBe('Run a command')
    expect(plainToolTitle('agentxp.browser_read')).toBe('Read the page')
    expect(plainToolTitle('agentxp.review_add_comment')).toBe('Add a review comment')
  })

  it('finds the tool behind a server prefix', () => {
    expect(plainToolTitle('mcp__agentxp__browser_click')).toBe('Click on the page')
    expect(plainToolTitle('other.browser_back')).toBe('Go back one page')
  })

  it('has no title for names it does not know, and toolTitleOr keeps them', () => {
    expect(plainToolTitle('Read src/a.ts')).toBeNull()
    expect(toolTitleOr('Read src/a.ts')).toBe('Read src/a.ts')
    expect(toolTitleOr('terminal')).toBe('Run a command')
  })
})

describe('liveToolTitle', () => {
  it('gives a sentence for a running Browser step and the plain title for other tools', () => {
    expect(liveToolTitle('agentxp.browser_type', '{"text":"hi"}')).toBe("Typing 'hi'")
    expect(liveToolTitle('terminal_run')).toBe('Run a command')
    expect(liveToolTitle('mystery')).toBeNull()
  })
})
