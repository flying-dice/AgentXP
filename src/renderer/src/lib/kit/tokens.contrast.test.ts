import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

const token = (name: string): string => {
  const match = new RegExp(`--${name}:\\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\s*;`).exec(css)
  if (!match) throw new Error(`token ${name} is not a plain hex colour`)
  const hex = match[1]
  return `#${hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex}`
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const ratio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** UX-48: text colours that sit on white must reach 4.5:1 (WCAG 1.4.3). */
describe('token contrast', () => {
  it.each(['w7-text', 'w7-text-muted', 'w7-accent-claude', 'w7-git-added', 'w7-git-modified', 'w7-git-deleted', 'w7-git-renamed', 'w7-link'])('%s on white is at least 4.5:1', (name) => {
    expect(ratio(token(name), '#ffffff')).toBeGreaterThanOrEqual(4.5)
  })
  it('disabled text keeps 3:1 on the window face', () => {
    expect(ratio(token('w7-text-disabled'), token('w7-face'))).toBeGreaterThanOrEqual(3)
  })
})
