import { describe, expect, it } from 'vitest'
import { highlighter, languageFromPath, plainTokens, tokensToHtml } from './highlighter'

describe('highlighter', () => {
  it('colours keywords, strings and comments like Visual Studio 2010', async () => {
    const [line1, line2] = await highlighter.tokenize('const s = "hi"\n// note', 'typescript')
    const colour = (tokens: typeof line1, text: string): string | undefined => tokens.find((t) => t.content.trim() === text)?.color?.toLowerCase()
    expect(colour(line1, 'const')).toBe('#0000ff')
    expect(colour(line1, '"hi"')).toBe('#a31515')
    expect(line2.some((t) => t.color?.toLowerCase() === '#008000')).toBe(true)
  })

  it('falls back to plain text for unknown languages', async () => {
    expect(await highlighter.tokenize('a\nb', 'definitely-not-a-language')).toEqual(plainTokens('a\nb'))
  })

  it('escapes html when rendering tokens', () => {
    expect(tokensToHtml([[{ content: '<a & b>', color: '#f00' }]])).toBe('<span style="color:#f00">&lt;a &amp; b&gt;</span>')
  })

  it('maps paths to languages', () => {
    expect(languageFromPath('C:\\src\\app.tsx')).toBe('tsx')
    expect(languageFromPath('Makefile')).toBe('text')
  })
})
