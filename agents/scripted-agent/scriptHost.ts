/** The script currently in force, with the bookkeeping of which `once` rules are used. Replaceable at run time. */
import { RuleSelector, type Selection } from './matcher.ts'
import type { Script, Step } from './script.ts'

export class ScriptHost {
  private script: Script
  private selector: RuleSelector

  constructor(script: Script) {
    this.script = script
    this.selector = new RuleSelector(script.rules)
  }

  get current(): Script {
    return this.script
  }

  /** Future turns use the new script; `once` rules become available again. */
  replace(script: Script): void {
    this.script = script
    this.selector = new RuleSelector(script.rules)
  }

  select(prompt: string): Selection | null {
    return this.selector.select(prompt)
  }

  /** Steps for a prompt no rule matched: the script's `fallback`, else one explanatory message. */
  fallbackSteps(): readonly Step[] {
    return this.script.fallback ?? [{ type: 'message', text: 'No scripted rule matches "{{prompt}}".' }]
  }
}
