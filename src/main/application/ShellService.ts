import type { PathOpener } from './ports'

export class ShellService {
  constructor(private readonly opener: PathOpener) {}

  openPath(path: string): Promise<void> {
    return this.opener.open(path)
  }
}
