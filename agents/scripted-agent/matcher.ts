/** Picks the rule a prompt triggers: the first match wins, `once` rules are consumed. */
import type { Match, Rule } from './script.ts'

/** Variables captured by a match: `match.0`, `match.1`, ... and `match.<name>` for named regex groups. */
export type Captures = Record<string, string>

const lower = (match: { ignoreCase?: boolean }, text: string): string => (match.ignoreCase ? text.toLowerCase() : text)

/** Null when the text does not match, otherwise the captured variables (empty unless a regex matched). */
export function matchPrompt(match: Match, text: string): Captures | null {
  if ('any' in match) return {}
  if ('equals' in match) return lower(match, text.trim()) === lower(match, match.equals.trim()) ? {} : null
  if ('contains' in match) return lower(match, text).includes(lower(match, match.contains)) ? {} : null
  const found = new RegExp(match.regex, match.ignoreCase ? 'i' : '').exec(text)
  if (!found) return null
  const captures: Captures = {}
  found.forEach((group, i) => {
    if (group !== undefined) captures[`match.${i}`] = group
  })
  for (const [name, group] of Object.entries(found.groups ?? {})) if (group !== undefined) captures[`match.${name}`] = group
  return captures
}

export interface Selection {
  rule: Rule
  captures: Captures
}

/** Remembers which `once` rules were used. One selector per loaded script. */
export class RuleSelector {
  private readonly consumed = new Set<string>()
  private readonly rules: readonly Rule[]

  constructor(rules: readonly Rule[]) {
    this.rules = rules
  }

  select(text: string): Selection | null {
    for (const rule of this.rules) {
      if (rule.once && this.consumed.has(rule.id)) continue
      const captures = matchPrompt(rule.match, text)
      if (!captures) continue
      if (rule.once) this.consumed.add(rule.id)
      return { rule, captures }
    }
    return null
  }
}
