import { describe, expect, it } from 'vitest'
import { expandsByDefault, toolArgument, toolLabel } from './toolSummary'

describe('toolLabel', () => {
  it('names tools by kind', () => {
    expect(toolLabel('read', 'x')).toBe('Read')
    expect(toolLabel('execute', 'x')).toBe('Bash')
    expect(toolLabel('edit', 'x')).toBe('Edit')
  })
  it('tells Grep from Glob by the input', () => {
    expect(toolLabel('search', 'x', '{"pattern":"a"}')).toBe('Grep')
    expect(toolLabel('search', 'x', '{"glob":"*.ts"}')).toBe('Glob')
    expect(toolLabel('search', 'x', null)).toBe('Search')
  })
  it('falls back to the agent tool name for other', () => {
    expect(toolLabel('other', 'mcp__a2ui__render')).toBe('mcp__a2ui__render')
    expect(toolLabel(undefined, '')).toBe('Tool')
  })
})

describe('toolArgument', () => {
  it('uses the path of read/edit', () => {
    expect(toolArgument('read', '{"file_path":"src/a.ts"}', [], 't')).toBe('src/a.ts')
    expect(toolArgument('edit', null, [{ path: 'src/b.ts', line: 12 }], 't')).toBe('src/b.ts:12')
    expect(toolArgument('edit', null, [{ path: 'src/b.ts', line: null }], 't')).toBe('src/b.ts')
  })
  it('uses the command of execute, or the title without backticks', () => {
    expect(toolArgument('execute', '{"command":"npm test"}', [], 't')).toBe('npm test')
    expect(toolArgument('execute', 'not json', [], '`ls -la`')).toBe('ls -la')
  })
  it('shows the pattern with its location', () => {
    expect(toolArgument('search', '{"pattern":"redirect","path":"src"}', [], 't')).toBe('redirect in src')
    expect(toolArgument('search', '{"pattern":"redirect"}', [], 't')).toBe('redirect')
  })
  it('shows moves and fetches', () => {
    expect(toolArgument('move', '{"from":"a","to":"b"}', [], 't')).toBe('a → b')
    expect(toolArgument('fetch', '{"url":"https://x.dev"}', [], 't')).toBe('https://x.dev')
  })
  it('falls back to known keys then the title', () => {
    expect(toolArgument('other', '{"description":"Plan"}', [], 't')).toBe('Plan')
    expect(toolArgument('other', '[]', [], 'Title')).toBe('Title')
  })
})

it('expands execute cards by default only', () => {
  expect(expandsByDefault('execute')).toBe(true)
  expect(expandsByDefault('read')).toBe(false)
})
