/** `/next`, `/auto`, `/manual`, `/script`, `/status`: step control typed into the chat while the agent is idle. */
import type { StepController } from './control.ts'
import type { CommandSpec } from './script.ts'

export const CONTROL_COMMANDS: readonly CommandSpec[] = [
  { name: 'next', description: 'Release the step a turn is paused before' },
  { name: 'auto', description: 'Run every step without pausing (releases a pause)' },
  { name: 'manual', description: 'Pause before every step until next' },
  { name: 'script', description: 'Let each step choose auto or manual again' },
  { name: 'status', description: 'Show the stepping state as JSON' }
]

/** The reply text when the prompt is a control command, else null. */
export function runSlashCommand(text: string, controller: StepController): string | null {
  const word = /^\/(\w+)\s*$/.exec(text.trim())?.[1]
  switch (word) {
    case 'next':
      return controller.next() ? 'Released the paused step.' : 'Nothing is paused.'
    case 'auto':
      controller.setMode('auto')
      return 'Mode: auto.'
    case 'manual':
      controller.setMode('manual')
      return 'Mode: manual. Release steps with /next or the control socket.'
    case 'script':
      controller.setMode(null)
      return 'Mode: each step decides.'
    case 'status':
      return JSON.stringify(controller.status())
    default:
      return null
  }
}
