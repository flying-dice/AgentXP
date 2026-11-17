import { cp, mkdir, readFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { SkillStore } from '../../application/teams/ports'

export class NodeSkillStore implements SkillStore {
  async readSkillFile(folder: string): Promise<string | null> {
    try {
      return await readFile(join(folder, 'SKILL.md'), 'utf8')
    } catch {
      return null
    }
  }

  async copy(folder: string, destination: string): Promise<void> {
    await rm(destination, { recursive: true, force: true })
    await mkdir(dirname(destination), { recursive: true })
    await cp(folder, destination, { recursive: true, filter: (source) => !/(^|[\\/])(\.git|node_modules)([\\/]|$)/.test(source) })
  }

  async remove(folder: string): Promise<void> {
    await rm(folder, { recursive: true, force: true })
  }
}
