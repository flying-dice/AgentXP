import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { STEP_TYPES, ScriptError, loadScript, validateScript } from './script.ts'

const here = dirname(fileURLToPath(import.meta.url))
const base = { name: 'n', agent: { name: 'a', version: '1' } }
const withRule = (steps: unknown[], match: unknown = { any: true }): unknown => ({ ...base, rules: [{ id: 'r', match, steps }] })
const reasonOf = (input: unknown): string => {
  try {
    validateScript(input)
  } catch (error) {
    expect(error).toBeInstanceOf(ScriptError)
    return (error as Error).message
  }
  throw new Error('expected a ScriptError')
}

describe('validateScript', () => {
  it('accepts every bundled sample script', () => {
    const files = readdirSync(join(here, 'scripts')).filter((f) => f.endsWith('.json'))
    expect(files.sort()).toEqual(['a2ui.json', 'aside.json', 'demo.json', 'desktop.json', 'errors.json', 'notices.json', 'review.json', 'search.json', 'show.json', 'stepping.json'])
    for (const file of files) expect(() => loadScript(join(here, 'scripts', file)), file).not.toThrow()
  })

  it('accepts a minimal script', () => {
    expect(validateScript({ ...base, rules: [] }).rules).toEqual([])
  })

  it('names the JSON path and reason of a bad value', () => {
    expect(reasonOf(withRule([{ type: 'message' }]))).toBe('$.rules[0].steps[0].text: is required')
    expect(reasonOf(withRule([{ type: 'message', text: 'x', chunked: 0 }]))).toContain('$.rules[0].steps[0].chunked')
    expect(reasonOf(withRule([{ type: 'plan', entries: [{ content: 'x', status: 'later', priority: 'high' }] }]))).toContain('$.rules[0].steps[0].entries[0].status: expected one of')
    expect(reasonOf(withRule([{ type: 'nope' }]))).toContain('$.rules[0].steps[0].type: expected one of message')
    expect(reasonOf({ ...base, rules: 'x' })).toBe('$.rules: expected an array')
    expect(reasonOf({ name: 'n', rules: [] })).toBe('$.agent: is required')
  })

  it('rejects unknown fields (typos) at every level', () => {
    expect(reasonOf({ ...base, rules: [], extra: 1 })).toBe('$.extra: unknown field')
    expect(reasonOf(withRule([{ type: 'message', text: 'x', txt: 'y' }]))).toBe('$.rules[0].steps[0].txt: unknown field')
    expect(reasonOf({ ...base, defaults: { stepmode: 'manual' }, rules: [] })).toBe('$.defaults.stepmode: unknown field')
  })

  it('checks matchers: exactly one kind, valid regex', () => {
    expect(reasonOf(withRule([], { equals: 'a', contains: 'b' }))).toContain('needs exactly one of')
    expect(reasonOf(withRule([], {}))).toContain('needs exactly one of')
    expect(reasonOf(withRule([], { regex: '(' }))).toContain('$.rules[0].match.regex: invalid regular expression')
    expect(reasonOf(withRule([], { any: false }))).toContain('$.rules[0].match.any')
    expect(() => validateScript(withRule([], { regex: '^hi', ignoreCase: true }))).not.toThrow()
  })

  it('checks permission branches against the option ids', () => {
    const permission = (branches: unknown): unknown =>
      withRule([{ type: 'requestPermission', toolCallId: 't', options: [{ optionId: 'ok', name: 'OK', kind: 'allow_once' }], branches }])
    expect(() => validateScript(permission({ ok: [{ type: 'end', stopReason: 'end_turn' }], cancelled: [] }))).not.toThrow()
    expect(reasonOf(permission({ nope: [] }))).toContain('$.rules[0].steps[0].branches.nope: is not an optionId')
    expect(reasonOf(permission({ ok: [{ type: 'message' }] }))).toBe('$.rules[0].steps[0].branches.ok[0].text: is required')
  })

  it('requires exactly one condition on expect and a compilable regex', () => {
    expect(reasonOf(withRule([{ type: 'expect', from: 'x' }]))).toContain('exactly one of contains, equals, regex')
    expect(reasonOf(withRule([{ type: 'expect', from: 'x', equals: 'a', contains: 'b' }]))).toContain('exactly one')
    expect(reasonOf(withRule([{ type: 'expect', from: 'x', regex: '[' }]))).toContain('invalid regular expression')
  })

  it('rejects duplicate rule ids', () => {
    const rule = { id: 'same', match: { any: true }, steps: [] }
    expect(reasonOf({ ...base, rules: [rule, rule] })).toBe('$.rules[1].id: duplicate rule id "same"')
  })
})

describe('loadScript', () => {
  it('prefixes errors with the file', () => {
    expect(() => loadScript(join(here, 'missing.json'))).toThrow(/Cannot read script .*missing\.json/)
    expect(() => loadScript(join(here, 'script.schema.json'))).toThrow(/Invalid script .*script\.schema\.json: \$\.name: is required/)
  })
})

describe('script.schema.json', () => {
  const schema = JSON.parse(readFileSync(join(here, 'script.schema.json'), 'utf8')) as { $defs: { step: { oneOf: Array<{ properties: { type: { const: string } } }> } } }

  it('describes exactly the step types the validator knows', () => {
    expect(schema.$defs.step.oneOf.map((s) => s.properties.type.const).sort()).toEqual([...STEP_TYPES].sort())
  })
})
