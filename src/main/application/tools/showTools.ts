import { ALIAS_NOTE, type ShowTarget } from '@shared/show'
import type { ToolHandlers } from './catalog'
import { attempt, textResult, type ToolContext } from './types'

export interface ShowToolsDeps {
  shows: { show(context: ToolContext, target: ShowTarget, note: string): Promise<{ text: string }> }
}

type ShowTool = 'show' | 'code_open' | 'code_reveal' | 'code_show_diff'

/**
 * show: the agent points the operator at one thing, with a reason (Show, `docs/AGENT_PRESENCE.md` section 5). The
 * `ShowService` applies the policy, the foreground rule and the queue. code_open, code_reveal and code_show_diff are
 * its deprecated aliases for one release: they take the old arguments and obey the same rules.
 */
export function createShowTools({ shows }: ShowToolsDeps): ToolHandlers<ShowTool> {
  const run = (context: ToolContext, target: ShowTarget, note: string | undefined) =>
    attempt(async () => textResult((await shows.show(context, target, note?.trim() || ALIAS_NOTE)).text))
  return {
    show: ({ target, note }, context) => run(context, target as ShowTarget, note),
    code_open: ({ path, line, note }, context) => run(context, { kind: 'file', path, ...(line === undefined ? {} : { lines: [line, line] as [number, number] }) }, note),
    code_reveal: ({ path, startLine, endLine, note }, context) => run(context, { kind: 'file', path, lines: [startLine, Math.max(startLine, endLine ?? startLine)] }, note),
    code_show_diff: ({ path, note }, context) => run(context, { kind: 'change', path }, note)
  }
}
