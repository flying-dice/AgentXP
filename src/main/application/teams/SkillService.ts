import { join } from 'node:path'
import type { Id } from '@shared/models'
import { parseSkillFrontMatter, type SkillDto } from '@shared/teams'
import type { SkillRepository } from '../../domain/repositories/teams-repositories'
import { AppError, required } from '../errors'
import type { SkillStore } from './ports'

/** The folder name an installed skill gets: its name with everything but letters, digits, `-` and `_` turned into `-`. */
export const skillFolderName = (name: string): string => name.trim().replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'skill'

/** Installs, removes and switches skills (folders with a `SKILL.md`). */
export class SkillService {
  constructor(
    private readonly skills: SkillRepository,
    private readonly store: SkillStore,
    /** `<userData>/skills`: each skill lives in `<skillsDir>/<name>/`. */
    private readonly skillsDir: string
  ) {}

  list(): SkillDto[] {
    return this.skills.list()
  }

  /** Installs the skill folder at `folder`: it must hold a `SKILL.md` whose front matter has a `name` and a `description`. */
  async install(folder: string): Promise<SkillDto> {
    const text = await this.store.readSkillFile(folder)
    if (text === null) throw new AppError('That folder has no SKILL.md. A skill is a folder with a SKILL.md file in it.')
    const meta = parseSkillFrontMatter(text)
    if (!meta) throw new AppError('SKILL.md must start with a front matter block that has a name and a description.')
    if (this.skills.getByName(meta.name)) throw new AppError(`A skill named "${meta.name}" is installed already. Remove it first to install another version.`)
    const destination = join(this.skillsDir, skillFolderName(meta.name))
    await this.store.copy(folder, destination)
    return this.skills.add({ name: meta.name, description: meta.description, path: destination })
  }

  async remove(id: Id): Promise<void> {
    const skill = required(this.skills.get(id), 'Skill')
    this.skills.remove(id)
    await this.store.remove(skill.path).catch(() => {}) // the row is gone either way
  }

  setEnabled(id: Id, enabled: boolean): void {
    required(this.skills.setEnabled(id, enabled) || null, 'Skill')
  }
}
