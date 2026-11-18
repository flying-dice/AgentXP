import type { ShowTarget } from '@shared/show'
import type { ToolHandlers } from './catalog'
import { attempt, textResult, type ToolContext } from './types'

export interface ShowToolsDeps {
  shows: { show(context: ToolContext, target: ShowTarget, note: string): Promise<{ text: string }> }
}

type ShowTool = 'show'

/**
 * show: the agent points the operator at one thing, with a reason (Show, `docs/AGENT_PRESENCE.md` section 5). The
 * `ShowService` applies the policy, the foreground rule and the queue.
 */
export function createShowTools({ shows }: ShowToolsDeps): ToolHandlers<ShowTool> {
  return {
    show: ({ target, note }, context) => attempt(async () => textResult((await shows.show(context, target as ShowTarget, note.trim())).text))
  }
}
