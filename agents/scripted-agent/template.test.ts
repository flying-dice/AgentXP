import { describe, expect, it } from 'vitest'
import { TemplateError, render, renderDeep } from './template.ts'

const vars = new Map([['prompt', 'hi'], ['cwd', '/w'], ['out.exitCode', '0']])

describe('render', () => {
  it('replaces variables, with optional spaces and dotted names', () => {
    expect(render('{{prompt}} in {{ cwd }} exit {{out.exitCode}}', vars)).toBe('hi in /w exit 0')
  })

  it('leaves text without placeholders and single braces alone', () => {
    expect(render('plain {x} ${/path}', vars)).toBe('plain {x} ${/path}')
  })

  it('fails on an unknown variable, listing the known ones', () => {
    expect(() => render('{{nobody}}', vars)).toThrow(TemplateError)
    expect(() => render('{{nobody}}', vars)).toThrow(/Known: prompt, cwd, out\.exitCode/)
  })
})

describe('renderDeep', () => {
  it('renders nested strings but not keys, numbers or skipped keys', () => {
    const value = { a: ['{{prompt}}', 1, { b: '{{cwd}}/x' }], '{{prompt}}': true, branches: { k: '{{unknown}}' } }
    expect(renderDeep(value, vars, ['branches'])).toEqual({ a: ['hi', 1, { b: '/w/x' }], '{{prompt}}': true, branches: { k: '{{unknown}}' } })
  })
})
