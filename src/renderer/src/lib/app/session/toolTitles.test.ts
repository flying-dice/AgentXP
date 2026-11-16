import { describe, expect, it } from 'vitest'
import { plainToolTitle, toolTitleOr } from './toolTitles'

describe('plainToolTitle', () => {
  it('names the tools by what they do', () => {
    expect(plainToolTitle('fs.read_text_file')).toBe('Read a file')
    expect(plainToolTitle('fs.write_text_file')).toBe('Change a file')
    expect(plainToolTitle('terminal')).toBe('Run a command')
    expect(plainToolTitle('agent7.browser_read')).toBe('Read the page')
    expect(plainToolTitle('agent7.review_add_comment')).toBe('Add a review comment')
  })

  it('finds the tool behind a server prefix', () => {
    expect(plainToolTitle('mcp__agent7__browser_click')).toBe('Click on the page')
    expect(plainToolTitle('other.browser_back')).toBe('Go back one page')
  })

  it('has no title for names it does not know, and toolTitleOr keeps them', () => {
    expect(plainToolTitle('Read src/a.ts')).toBeNull()
    expect(toolTitleOr('Read src/a.ts')).toBe('Read src/a.ts')
    expect(toolTitleOr('terminal')).toBe('Run a command')
  })
})
