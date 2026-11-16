/** Finds a script file from what the user typed after `--script`. */
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

/** Folders that may hold `scripts/`: next to this file (source run) or in the repo (bundled run from out/main). */
const scriptFolders = (): string[] => {
  const entry = process.argv[1] ? dirname(resolve(process.argv[1])) : process.cwd()
  return [join(entry, 'scripts'), join(process.cwd(), 'agents', 'scripted-agent', 'scripts')]
}

/** `--script` value as given, else a bundled script by name (with or without `.json`). */
export function resolveScriptPath(value: string): string {
  const candidates = [resolve(value), ...scriptFolders().flatMap((dir) => [join(dir, value), join(dir, `${value}.json`)])]
  return candidates.find((c) => existsSync(c) && c.endsWith('.json')) ?? resolve(value)
}
