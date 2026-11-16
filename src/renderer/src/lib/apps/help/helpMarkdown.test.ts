import { describe, expect, it } from 'vitest'
import { escapeHtml, renderHelpMarkdown, slugOf } from './helpMarkdown'

describe('renderHelpMarkdown', () => {
  it('renders headings with ids, paragraphs, bold and lists', () => {
    const html = renderHelpMarkdown('## 3 - The Window\n\nText with **bold**.\n\n- one\n- two\n\n1. first\n2. second')
    expect(html).toContain('<h2 id="3-the-window">3 - The Window</h2>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<ol>')
  })

  it('renders tables and code', () => {
    const html = renderHelpMarkdown('| Name | Id |\n|---|---|\n| Send | `chat-send` |\n\n```bash\nnpm test <now>\n```')
    expect(html).toContain('<table>')
    expect(html).toContain('<code>chat-send</code>')
    expect(html).toContain('<pre data-lang="bash"><code>npm test &lt;now&gt;')
  })

  it('shows raw HTML as text', () => {
    const html = renderHelpMarkdown('<script>alert(1)</script>\n\nA <img src=x onerror=alert(1)> b')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;')
  })

  it('links to other topics and drops every other link target', () => {
    const topic = renderHelpMarkdown('[Notepad](notepad.md)')
    expect(topic).toContain('<a href="notepad.md" data-topic="notepad" data-testid="help-link">Notepad</a>')
    const web = renderHelpMarkdown('[site](https://example.com) and [bad](javascript:alert(1))')
    expect(web).not.toContain('<a ')
    expect(web).toContain('site (https://example.com)')
    expect(web).not.toContain('href="javascript')
  })

  it('shows an image as its alt text', () => {
    expect(renderHelpMarkdown('![The window](x.png)')).not.toContain('<img')
  })
})

describe('escapeHtml and slugOf', () => {
  it('escapes the five special characters', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;')
  })
  it('makes a slug of a heading', () => {
    expect(slugOf('The Window')).toBe('the-window')
    expect(slugOf('4 - Controls Reference')).toBe('4-controls-reference')
  })
})
