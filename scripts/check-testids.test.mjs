import { describe, expect, it } from 'vitest'
import { elementProblems, menuItemProblems } from './check-testids.mjs'

const markup = (body) => `<script lang="ts">\n  const x = '<button>'\n</script>\n${body}\n<style>\n  button { color: red }\n</style>`

describe('elementProblems', () => {
  it('reports native controls, kit controls and clickable elements without a test id', () => {
    const found = elementProblems(
      markup(`<button onclick={go}>Go</button>
<input bind:value={v} />
<a href={url}>Open</a>
<div class="tile" onclick={pick}></div>
<span role="tab">A</span>
<CheckBox label="Bold" />
<ToolStripButton text="B" onclick={bold} />`)
    )
    expect(found.map((p) => p.why)).toEqual(['<button>', '<input>', '<a>', '<div onclick>', 'role="tab"', 'CheckBox', 'ToolStripButton'])
    expect(found[0].line).toBe(4)
  })

  it('accepts data-testid, testid, rowTestid and spread props, and skips wrappers and hidden inputs', () => {
    const found = elementProblems(
      markup(`<button data-testid="x-go" onclick={go}>Go</button>
<CheckBox testid="x-bold" label="Bold" />
<ListView rowTestid="x-row" {rows} />
<Button {...rest} />
<input type="hidden" name="a" />
<div role="presentation" onkeydown={route}></div>
<div class="label">Text</div>
<button
  type="button"
  data-testid={active ? 'x-on' : 'x-off'}
  onclick={() => (active = !active)}>Toggle</button>`)
    )
    expect(found).toEqual([])
  })
})

describe('menuItemProblems', () => {
  it('reports menu items with an action but no testid or id', () => {
    const src = `const items = [
  { label: '&Open', action: () => open() },
  { id: 'save', label: '&Save', action: () => save() },
  { testid: 'x-close', label: 'Close', action: close },
  { label: '&View', items: [{ label: 'Zoom', action: () => zoom({ by: 2 }) }] },
  { ...item, label: 'Copy', action: copy }
]`
    expect(menuItemProblems(src).map((p) => p.text.trim())).toEqual(["{ label: '&Open', action: () => open() },", "{ label: 'Zoom', action: () => zoom({ by: 2 }) }] },"])
  })
})
