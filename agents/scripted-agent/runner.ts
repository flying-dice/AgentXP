/** Executes the steps of one prompt turn: pausing for manual steps, delays, templating, permission branches. */
import { RequestError } from '@agentclientprotocol/sdk'
import { CancelledError, sleep, throwIfAborted } from './abortable.ts'
import { ACTIONS, INTERNAL_ERROR, sendUpdate, type ActionContext } from './actions.ts'
import type { StepController } from './control.ts'
import type { Step, StopReason } from './script.ts'
import { TemplateError, renderDeep } from './template.ts'

export interface TurnInput {
  /** Id of the matched rule, or null for the fallback. */
  rule: string | null
  steps: readonly Step[]
}

export class TurnRunner {
  private readonly ctx: ActionContext
  private readonly controller: StepController

  constructor(ctx: ActionContext, controller: StepController) {
    this.ctx = ctx
    this.controller = controller
  }

  /**
   * Runs the turn and returns the stop reason. A cancelled turn returns `cancelled`; `error` steps, failed
   * `expect` steps and template errors reject with a JSON-RPC error.
   */
  async run({ rule, steps }: TurnInput): Promise<StopReason> {
    this.controller.turnStarted(rule)
    let outcome: StopReason | 'error' = 'error'
    try {
      outcome = (await this.runSteps(rule, steps, '')) ?? 'end_turn'
      return outcome
    } catch (error) {
      if (error instanceof CancelledError || this.ctx.signal.aborted) return (outcome = 'cancelled')
      if (error instanceof TemplateError) throw new RequestError(INTERNAL_ERROR, error.message)
      throw error
    } finally {
      this.controller.turnEnded(outcome)
    }
  }

  /** Null when the list ran to its end; a stop reason when an `end` step (or a branch's) finished the turn. */
  private async runSteps(rule: string | null, steps: readonly Step[], prefix: string): Promise<StopReason | null> {
    const { ctx } = this
    for (const [index, raw] of steps.entries()) {
      throwIfAborted(ctx.signal)
      const path = `${prefix}${index}`
      const mode = raw.step ?? ctx.defaults.stepMode ?? 'auto'
      const position = { rule, stepIndex: index, path, stepType: raw.type, label: raw.label ?? null }
      await this.controller.beforeStep(position, mode, ctx.signal, ctx.defaults.announcePause ? () => this.announce(path, raw) : undefined)
      throwIfAborted(ctx.signal)
      await sleep(raw.delayMs ?? ctx.defaults.delayMs ?? 0, ctx.signal)
      const step = renderDeep(raw, ctx.vars, ['branches'])
      if (step.type === 'end') return step.stopReason
      const result = await ACTIONS[step.type](step as never, ctx)
      if (step.type === 'requestPermission' && typeof result === 'string') {
        const branch = step.branches?.[result]
        const stop = branch ? await this.runSteps(rule, branch, `${path}/${result}/`) : null
        if (stop) return stop
      }
    }
    return null
  }

  private announce(path: string, step: Step): Promise<void> {
    const what = step.label ? `${step.type} "${step.label}"` : step.type
    return sendUpdate(this.ctx.client, this.ctx.sessionId, {
      sessionUpdate: 'agent_thought_chunk',
      content: { type: 'text', text: `[paused before step ${path}: ${what}; waiting for next]` }
    })
  }
}
