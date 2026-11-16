import { constants } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import { delimiter, join } from 'node:path'
import type { CommandLocator } from '../../application/AgentService'

export interface NodeCommandLocatorOptions {
  env?: NodeJS.ProcessEnv
  platform?: NodeJS.Platform
}

/** Looks a command up the way a shell does: a path is checked as it is, a bare name is searched on PATH (with PATHEXT on Windows). */
export class NodeCommandLocator implements CommandLocator {
  private readonly env: NodeJS.ProcessEnv
  private readonly platform: NodeJS.Platform

  constructor(options: NodeCommandLocatorOptions = {}) {
    this.env = options.env ?? process.env
    this.platform = options.platform ?? process.platform
  }

  async exists(command: string): Promise<boolean> {
    const name = command.trim()
    if (!name) return false
    const windows = this.platform === 'win32'
    const extensions = windows ? ['', ...(this.env['PATHEXT'] ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)] : ['']
    const directories = /[\\/]/.test(name) ? [''] : (this.env['PATH'] ?? this.env['Path'] ?? '').split(delimiter).filter(Boolean)
    for (const directory of directories) {
      for (const extension of extensions) {
        if (await this.runnable(directory ? join(directory, name + extension) : name + extension, windows)) return true
      }
    }
    return false
  }

  private async runnable(path: string, windows: boolean): Promise<boolean> {
    try {
      if (!(await stat(path)).isFile()) return false
      await access(path, windows ? constants.F_OK : constants.X_OK)
      return true
    } catch {
      return false
    }
  }
}
