import type { Page } from 'playwright'
import { DesktopPage } from './pages/DesktopPage'
import { LauncherPage } from './pages/LauncherPage'
import { launchAgentXP, type AgentXPInstance } from './launch'
import { addProject, desktopIdByTitle, registerFakeAgent, type Workspace } from './setup'

export interface ConnectedDesktop {
  readonly app: AgentXPInstance
  readonly launcherPage: Page
  readonly launcher: LauncherPage
  readonly desktopPage: Page
  readonly desktop: DesktopPage
  readonly desktopId: number
}

/**
 * Starts the app, registers the fake agent, creates a desktop through the launcher UI (optionally with the
 * workspace plugged in at creation) and connects to it.
 */
export async function startConnectedDesktop(options: { title?: string; workspace?: Workspace; userData?: string; /** Registers the agent of the run (default: the fake agent). */ agent?: (launcherPage: Page) => Promise<unknown> } = {}): Promise<ConnectedDesktop> {
  const title = options.title ?? 'E2E desktop'
  const app = await launchAgentXP({ userData: options.userData })
  const launcherPage = await app.launcherWindow()
  const launcher = new LauncherPage(launcherPage)
  await (options.agent ?? registerFakeAgent)(launcherPage)
  if (options.workspace) await addProject(launcherPage, options.workspace)
  await launcher.createDesktop(title, { projects: options.workspace ? [options.workspace.name] : [] })
  const desktopId = await desktopIdByTitle(launcherPage, title)
  await launcher.connect(title)
  const desktopPage = await app.desktopWindow(desktopId)
  const desktop = new DesktopPage(desktopPage)
  await desktop.taskbar.waitFor()
  return { app, launcherPage, launcher, desktopPage, desktop, desktopId }
}
