/** `{{var}}` templating for the text fields of steps. */

export class TemplateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TemplateError'
  }
}

export type Vars = ReadonlyMap<string, string>

const PLACEHOLDER = /\{\{\s*([\w.-]+)\s*\}\}/g

/** Replaces every `{{name}}`; an unknown name is an error (a typo must not silently produce empty text). */
export function render(text: string, vars: Vars): string {
  return text.replace(PLACEHOLDER, (_all, name: string) => {
    const value = vars.get(name)
    if (value === undefined) throw new TemplateError(`Unknown template variable {{${name}}}. Known: ${[...vars.keys()].join(', ') || '(none)'}`)
    return value
  })
}

/** A string that is only `{{name|number}}`: the variable as a JSON number (tool arguments such as a browser `ref`). */
const NUMBER_PLACEHOLDER = /^\{\{\s*([\w.-]+)\|number\s*\}\}$/

/** Renders every string inside a JSON value (keys are left alone), except the keys listed in `skip`. */
export function renderDeep<T>(value: T, vars: Vars, skip: readonly string[] = []): T {
  if (typeof value === 'string') {
    const typed = NUMBER_PLACEHOLDER.exec(value)
    if (typed) {
      const raw = vars.get(typed[1])
      if (raw === undefined) throw new TemplateError(`Unknown template variable {{${typed[1]}}}. Known: ${[...vars.keys()].join(', ') || '(none)'}`)
      if (raw.trim() === '' || !Number.isFinite(Number(raw))) throw new TemplateError(`Template variable {{${typed[1]}}} is not a number: ${JSON.stringify(raw.slice(0, 80))}`)
      return Number(raw) as T
    }
    return render(value, vars) as T
  }
  if (Array.isArray(value)) return value.map((item) => renderDeep(item, vars)) as T
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) out[key] = skip.includes(key) ? item : renderDeep(item, vars)
    return out as T
  }
  return value
}
