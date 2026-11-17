import { afterAll, beforeAll, describe, it } from 'vitest'
import type { Page } from 'playwright'
import { launchAgentXP, registerFakeAgent, see, type AgentXPInstance } from './fixtures'

/** UX-04 to UX-07: help key, access keys and the live name check in the launcher. */
describe('launcher keyboard and name check', () => {
  let app: AgentXPInstance
  let page: Page

  beforeAll(async () => {
    app = await launchAgentXP()
    page = await app.launcherWindow()
    await registerFakeAgent(page)
  })
  afterAll(async () => {
    await app?.close()
  })

  it('F1 opens the launcher help, Esc closes it', async () => {
    // Keys are only heard once the launcher has loaded (its keyboard handler mounts with the page), as a person would wait.
    await see.visible(page.getByTestId('launcher-empty-help'))
    await page.keyboard.press('F1')
    await see.visible(page.getByTestId('launcher-help'))
    await page.keyboard.press('Escape')
    await see.gone(page.getByTestId('launcher-help'))
  })

  it('Alt+N opens New desktop', async () => {
    await page.keyboard.press('Alt+n')
    await see.visible(page.getByTestId('new-desktop-name'))
  })

  it('the name box checks the name as you type', async () => {
    await page.getByTestId('new-desktop-name').fill('')
    await see.text(page.getByTestId('new-desktop-error'), /\S/)
    await page.getByTestId('new-desktop-name').fill('Work')
    await see.text(page.getByTestId('new-desktop-error'), /^\s*$/)
  })
})
