import { spawn } from 'node:child_process'
import type { CommandResult, CommandRunner } from '../../application/tools/ports'
import { BoundedOutput } from '../acp/boundedOutput'
import { killProcessTree, treeSpawnOptions } from '../acp/processTree'
import { childEnv } from './childEnv'

const OUTPUT_BYTE_LIMIT = 256 * 1024

/** Runs a command line through the platform shell (sh -c / cmd.exe), killing the whole tree on timeout. */
export class ShellCommandRunner implements CommandRunner {
  run(command: string, options: { cwd: string; timeoutMs: number; onOutput?: (text: string) => void }): Promise<CommandResult> {
    return new Promise((resolve) => {
      const output = new BoundedOutput(OUTPUT_BYTE_LIMIT)
      const shellOptions = treeSpawnOptions()
      const child = spawn(command, { cwd: options.cwd, env: childEnv(), stdio: ['ignore', 'pipe', 'pipe'], ...shellOptions, shell: true })
      let timedOut = false
      const timer = setTimeout(() => {
        timedOut = true
        void killProcessTree(child)
      }, options.timeoutMs)
      const onData = (chunk: Buffer): void => {
        const text = output.append(chunk)
        if (text) options.onOutput?.(text)
      }
      child.stdout?.on('data', onData)
      child.stderr?.on('data', onData)
      const done = (exitCode: number | null): void => {
        clearTimeout(timer)
        output.finish()
        resolve({ exitCode, timedOut, output: output.value })
      }
      child.once('error', (error) => {
        output.append(Buffer.from(`${error.message}\n`))
        done(127)
      })
      child.once('close', (code) => done(code))
    })
  }
}
