import { spawn, type ChildProcess } from 'node:child_process'

export const isWindows = (): boolean => process.platform === 'win32'

/** Options that make a child killable as a tree on every platform. */
export const treeSpawnOptions = (): { detached: boolean; shell: boolean; windowsHide: boolean } => ({
  detached: !isWindows(),
  shell: isWindows(),
  windowsHide: true
})

export const hasExited = (child: ChildProcess): boolean => child.exitCode !== null || child.signalCode !== null

function signalTree(child: ChildProcess, signal: NodeJS.Signals): void {
  const pid = child.pid
  if (pid === undefined) return
  try {
    if (isWindows()) {
      spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }).on('error', () => {})
    } else {
      process.kill(-pid, signal)
    }
  } catch {
    child.kill(signal)
  }
}

/**
 * Asks the process tree to stop (SIGTERM), then forces it (SIGKILL) after
 * `graceMs`. Resolves once the child has exited.
 */
export async function killProcessTree(child: ChildProcess, graceMs = 2000): Promise<void> {
  if (hasExited(child) || child.pid === undefined) return
  const exited = new Promise<void>((resolve) => child.once('close', () => resolve()))
  signalTree(child, 'SIGTERM')
  const timer = setTimeout(() => signalTree(child, 'SIGKILL'), graceMs)
  await exited
  clearTimeout(timer)
}
