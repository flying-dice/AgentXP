/**
 * SETUP helpers. These are the ONLY place that talks to the backend through `window.agent7`
 * (inside `page.evaluate`): they prepare data the UI cannot create (a registered agent, a temp
 * workspace, a plugged-in drive). Specs and page objects verify behaviour through test ids only.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import type { Page } from 'playwright'
import { projectRoot } from './launch'

export const fakeAgentScript = join(projectRoot, 'src/main/infrastructure/acp/__fixtures__/fake-agent.ts')

export interface Workspace {
  readonly path: string
  /** Folder name, as the app shows it in the "Projects" list. */
  readonly name: string
  remove(): Promise<void>
}

/** A temp project directory with the given files (relative path -> text). */
export async function createWorkspace(files: Record<string, string> = { 'README.md': '# Demo project\n', 'src/index.ts': 'export const answer = 42\n' }): Promise<Workspace> {
  const path = await mkdtemp(join(tmpdir(), 'a7-e2e-ws-'))
  for (const [relative, text] of Object.entries(files)) {
    const file = join(path, relative)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, text)
  }
  return { path, name: path.split(/[\\/]/).pop() ?? path, remove: () => rm(path, { recursive: true, force: true }) }
}

/** Registers the fixture ACP agent (`fake-agent.ts`) as the default agent. Returns its id. */
export async function registerFakeAgent(page: Page, name = 'Fake agent'): Promise<number> {
  return page.evaluate(
    async ({ name, script }) => {
      const api = (window as unknown as { agent7: import('../../src/shared/ipc').Agent7Api }).agent7
      const agent = await api.agents.create({ name, command: 'node', args: ['--experimental-strip-types', '--no-warnings', script], env: {} })
      await api.agents.setDefault(agent.id)
      return agent.id
    },
    { name, script: fakeAgentScript }
  )
}

/** Adds the workspace folder to the app (so it shows up in "New desktop"). Returns the folder id. */
export async function addProject(page: Page, workspace: Workspace): Promise<number> {
  return page.evaluate(async (path) => (await (window as unknown as { agent7: import('../../src/shared/ipc').Agent7Api }).agent7.folders.add(path)).id, workspace.path)
}

/** Plugs the workspace into a RUNNING desktop as the next USB drive (what the Explorer's "Plug in a project" does). */
export async function plugWorkspaceIn(desktopPage: Page, desktopId: number, workspace: Workspace): Promise<string> {
  return desktopPage.evaluate(
    async ({ desktopId, path }) => {
      const api = (window as unknown as { agent7: import('../../src/shared/ipc').Agent7Api }).agent7
      const folder = await api.folders.add(path)
      const drive = await api.drives.plugIn(desktopId, folder.id)
      if (!drive) throw new Error('the project was not plugged in')
      return drive.letter
    },
    { desktopId, path: workspace.path }
  )
}

/** Lets the agent run shell commands without a prompt (the fake agent also runs a terminal command). */
export async function allowTerminal(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const api = (window as unknown as { agent7: import('../../src/shared/ipc').Agent7Api }).agent7
    const policy = await api.desktop.policy()
    await api.desktop.setPolicy({ ...policy, groups: { ...policy.groups, terminal: 'allow' } })
  })
}

/** The id of the desktop a window shows, read from its URL (`?desktop=<id>`). */
export const desktopIdOf = (page: Page): number => Number(new URL(page.url()).searchParams.get('desktop'))

/** Reads the id of a desktop by its title from the launcher (setup/read only). */
export async function desktopIdByTitle(launcherPage: Page, title: string): Promise<number> {
  return launcherPage.evaluate(async (title) => {
    const api = (window as unknown as { agent7: import('../../src/shared/ipc').Agent7Api }).agent7
    const found = (await api.launcher.list()).find((d) => d.title === title)
    if (!found) throw new Error(`no desktop titled ${title}`)
    return found.id
  }, title)
}
