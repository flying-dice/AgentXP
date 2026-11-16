import { access, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { delimiter, isAbsolute, join } from 'node:path'
import type { ProgramFinder } from '../../application/ports'

export interface ProgramFinderOptions {
  platform?: NodeJS.Platform
  /** The PATH to search; defaults to the one of this process. */
  path?: string
  /** Windows: the extensions that make a file runnable; defaults to PATHEXT. */
  pathExt?: string
}

const isRunnable = async (file: string, platform: NodeJS.Platform): Promise<boolean> => {
  try {
    if (!(await stat(file)).isFile()) return false
    if (platform !== 'win32') await access(file, constants.X_OK)
    return true
  } catch {
    return false
  }
}

/** Looks a command up like a shell would (`which`), without starting it. */
export class PathProgramFinder implements ProgramFinder {
  private readonly platform: NodeJS.Platform
  private readonly path: () => string
  private readonly pathExt: string

  constructor(options: ProgramFinderOptions = {}) {
    this.platform = options.platform ?? process.platform
    this.path = () => options.path ?? process.env['PATH'] ?? process.env['Path'] ?? ''
    this.pathExt = options.pathExt ?? process.env['PATHEXT'] ?? '.COM;.EXE;.BAT;.CMD'
  }

  async exists(command: string): Promise<boolean> {
    const name = command.trim().replace(/^"(.*)"$/, '$1')
    if (!name) return false
    const hasFolder = /[\\/]/.test(name) || isAbsolute(name)
    const folders = hasFolder ? [''] : this.path().split(delimiter).filter(Boolean)
    for (const folder of folders) {
      for (const candidate of this.candidates(folder ? join(folder, name) : name)) if (await isRunnable(candidate, this.platform)) return true
    }
    return false
  }

  /** The file itself and, on Windows, with each runnable extension. */
  private candidates(file: string): string[] {
    if (this.platform !== 'win32') return [file]
    const extensions = this.pathExt.split(';').filter(Boolean)
    return [file, ...extensions.map((e) => file + e.toLowerCase()), ...extensions.map((e) => file + e.toUpperCase())]
  }
}
