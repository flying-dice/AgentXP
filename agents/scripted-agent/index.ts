/**
 * Scripted ACP agent for end-to-end tests of Agent7. Speaks ACP over stdio.
 *
 *   node --experimental-strip-types --no-warnings agents/scripted-agent/index.ts --script demo
 *   ELECTRON_RUN_AS_NODE=1 electron out/main/scripted-agent.js --script <file>
 *
 * Script: `--script <path|name>` or env AGENT7_SCRIPT (default `demo`). Control socket: env AGENT7_SCRIPT_CONTROL.
 */
import { Readable, Writable } from 'node:stream'
import { ndJsonStream } from '@agentclientprotocol/sdk'
import { createScriptedAgent } from './agent.ts'
import { ControlServer, StepController } from './control.ts'
import { loadScript } from './script.ts'
import { resolveScriptPath } from './scriptPath.ts'
import { ScriptHost } from './scriptHost.ts'

const ENV_SCRIPT = 'AGENT7_SCRIPT'
const ENV_CONTROL = 'AGENT7_SCRIPT_CONTROL'

function scriptArg(argv: string[]): string {
  const at = argv.indexOf('--script')
  if (at >= 0) return argv[at + 1] ?? ''
  return process.env[ENV_SCRIPT] || 'demo'
}

async function main(): Promise<void> {
  const file = resolveScriptPath(scriptArg(process.argv.slice(2)))
  const host = new ScriptHost(loadScript(file))
  const controller = new StepController()
  controller.setScriptName(host.current.name)

  const control = new ControlServer(controller, {
    load: (path) => {
      host.replace(loadScript(resolveScriptPath(path)))
      controller.setScriptName(host.current.name)
    }
  })
  if (process.env[ENV_CONTROL]) await control.listen(process.env[ENV_CONTROL])

  const scripted = createScriptedAgent(host, controller)
  const connection = scripted.app.connect(
    ndJsonStream(Writable.toWeb(process.stdout) as WritableStream<Uint8Array>, Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>)
  )
  await connection.closed
  await scripted.dispose()
  await control.close()
  process.exit(0)
}

main().catch((error: unknown) => {
  process.stderr.write(`scripted-agent: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
