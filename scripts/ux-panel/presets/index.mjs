import { TASKS } from '../tasks.mjs'
import { presets as basic } from './basic.mjs'
import { presets as chat } from './chat.mjs'
import { presets as desktops } from './desktops.mjs'
import { presets as misc } from './misc.mjs'
import { presets as features } from './features.mjs'

export const PRESETS = { ...basic, ...chat, ...desktops, ...misc, ...features }

export async function runPreset(ctx, taskId) {
  const task = TASKS[taskId]
  if (!task) throw new Error(`unknown task ${taskId}`)
  const fn = PRESETS[task.preset]
  if (!fn) throw new Error(`task ${taskId} maps to unknown preset ${task.preset}`)
  ctx.state.options = task.options ?? {}
  const note = await fn(ctx, task.options ?? {})
  return { preset: task.preset, note: typeof note === 'string' ? note : undefined }
}
