/**
 * Helpers for looking at a change in the real app (see `.claude/skills/verify-change/SKILL.md`): screenshots to
 * eyeball, and resizing the app window to check small-window layouts. Specs can use them too.
 */
import type { Page } from 'playwright'
import type { AgentXPInstance } from './launch'

/**
 * Saves a screenshot of `page` as `<A7_SHOTS>/<name>.png` when the `A7_SHOTS` environment variable names a folder,
 * and does nothing otherwise, so a spec can keep its `shot()` calls in CI.
 */
export async function shot(page: Page, name: string): Promise<void> {
  const dir = process.env.A7_SHOTS
  if (dir) await page.screenshot({ path: `${dir}/${name}.png` })
}

/** Resizes the content of every visible app window and waits until `page` has that size. */
export async function setWindowSize(app: AgentXPInstance, page: Page, width: number, height: number): Promise<void> {
  await app.app.evaluate(
    ({ BrowserWindow }, [w, h]) => {
      for (const win of BrowserWindow.getAllWindows()) if (win.isVisible()) win.setContentSize(w, h)
    },
    [width, height]
  )
  await page.waitForFunction(([w, h]) => window.innerWidth === w && window.innerHeight === h, [width, height])
}
