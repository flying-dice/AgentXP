/**
 * Launches the BUILT app (`npx electron-vite build` first) with an isolated user-data directory.
 * `playwright` is resolved through `createRequire` so that a global install (NODE_PATH) works too.
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ElectronApplication, Page } from 'playwright'

const require = createRequire(import.meta.url)
const { _electron: electron } = require('playwright') as typeof import('playwright')

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
/** Default timeout of every Playwright wait (auto-waiting locators, `expect(...).toBeVisible()`). */
export const WAIT_MS = 20_000

export interface Agent7Instance {
  readonly app: ElectronApplication
  /** The user-data directory of this run. */
  readonly userData: string
  /** The launcher window (the first window the app opens). */
  launcherWindow(): Promise<Page>
  /** Resolves with the window of a connected desktop (`?desktop=<id>`); waits until it exists and is ready. */
  desktopWindow(desktopId: number): Promise<Page>
  /** Resolves when no window shows the desktop any more. */
  waitForDesktopWindowClosed(desktopId: number): Promise<void>
  /** Closes the app and removes the user-data directory unless it was supplied by the caller. */
  close(): Promise<void>
}

export interface LaunchOptions {
  /** Reuse a user-data directory (restart tests). It is NOT deleted on close. */
  userData?: string
}

export async function launchAgent7(options: LaunchOptions = {}): Promise<Agent7Instance> {
  const ownsUserData = !options.userData
  const userData = options.userData ?? (await mkdtemp(join(tmpdir(), 'a7-e2e-data-')))
  const app = await electron.launch({
    executablePath: require('electron') as string,
    args: [join(projectRoot, 'out/main/index.js'), '--no-sandbox'],
    cwd: projectRoot,
    env: { ...process.env, AGENT7_USER_DATA: userData } as Record<string, string>
  })
  app.context().setDefaultTimeout(WAIT_MS)
  // The specs look at tool cards and narration, which the app folds by default (View > Show thinking and tool details).
  await app.context().addInitScript(() => window.localStorage.setItem('agent7.transcript.detail', 'all'))

  const ready = async (page: Page): Promise<Page> => {
    await page.waitForFunction(() => Boolean((window as unknown as { agent7?: unknown }).agent7))
    return page
  }
  const findDesktopWindow = (id: number): Page | undefined => app.windows().find((w) => w.url().includes(`desktop=${id}`))

  const poll = async (condition: () => boolean, what: string): Promise<void> => {
    const deadline = Date.now() + WAIT_MS
    while (!condition()) {
      if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`)
      await new Promise((resolveTick) => setImmediate(resolveTick))
      await new Promise((resolveTick) => setTimeout(resolveTick, 25))
    }
  }

  return {
    app,
    userData,
    async launcherWindow() {
      return ready(await app.firstWindow())
    },
    async desktopWindow(desktopId) {
      await poll(() => findDesktopWindow(desktopId) !== undefined, `the window of desktop ${desktopId}`)
      return ready(findDesktopWindow(desktopId)!)
    },
    async waitForDesktopWindowClosed(desktopId) {
      await poll(() => findDesktopWindow(desktopId) === undefined, `the window of desktop ${desktopId} to close`)
    },
    async close() {
      await app.close().catch(() => undefined)
      if (ownsUserData) await rm(userData, { recursive: true, force: true })
    }
  }
}
