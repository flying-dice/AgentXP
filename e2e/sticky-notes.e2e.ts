import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { reconnectDesktop, see, startConnectedDesktop, type ConnectedDesktop } from './fixtures'

/** Sticky Notes: add, type, recolour and delete notes, and keep them over a restart. */
describe('Sticky Notes', () => {
  let userData: string
  let ctx: ConnectedDesktop

  beforeAll(async () => {
    userData = await mkdtemp(join(tmpdir(), 'a7-e2e-notes-'))
    ctx = await startConnectedDesktop({ title: 'Notes desktop', userData })
  })
  afterAll(async () => {
    await ctx?.app.close()
    await rm(userData, { recursive: true, force: true })
  })

  // The notes stick on the desktop itself; the Sticky Notes window lists them.
  const notes = () => ctx.desktopPage.getByTestId('notes-sticky')

  it('New note adds an empty note that takes typed text', async () => {
    await ctx.desktop.openApp('sticky-notes')
    const frame = ctx.desktop.window('sticky-notes')
    await see.visible(frame.getByTestId('sticky-notes-app'))
    await frame.getByTestId('sticky-notes-new').click()
    await see.count(notes(), 1)
    // The note starts below the top bar, so its strip (drag, +, x) is never hidden by the bar.
    const bar = (await ctx.desktopPage.getByTestId('topbar-tool-chips').boundingBox())!
    expect((await notes().first().boundingBox())!.y).toBeGreaterThanOrEqual(bar.y + bar.height)
    await notes().first().getByTestId('notes-sticky-text').fill('Buy milk')
    await frame.getByTestId('sticky-notes-new').click()
    await see.count(notes(), 2)
    await notes().nth(1).getByTestId('notes-sticky-text').fill('Call the bank')
  })

  it('the context menu of a note changes its colour', async () => {
    // New notes cascade 28 px down and right: the corner of the first one shows above the second.
    await notes().first().click({ button: 'right', position: { x: 12, y: 12 } })
    await ctx.desktopPage.getByTestId('notes-ctx-color-pink').click()
    await see.attribute(notes().first(), 'data-color', 'pink')
  })

  it('the close button of a note deletes it', async () => {
    await notes().nth(1).hover()
    await notes().nth(1).getByTestId('notes-sticky-delete').click()
    await see.count(notes(), 1)
  })

  it('keeps the notes, their text and colour when the window closes and AgentXP restarts', async () => {
    // Notes show on the desktop only while Sticky Notes is open.
    await ctx.desktop.closeWindow('sticky-notes')
    await see.count(notes(), 0)
    await ctx.desktop.openApp('sticky-notes')
    await see.count(notes(), 1)
    await ctx.app.close()
    ctx = await reconnectDesktop(userData, 'Notes desktop')
    if ((await ctx.desktop.windows('sticky-notes').count()) === 0) await ctx.desktop.openApp('sticky-notes')
    await see.count(notes(), 1)
    await see.eventually(async () => expect(await notes().first().getByTestId('notes-sticky-text').inputValue()).toBe('Buy milk'))
    await see.attribute(notes().first(), 'data-color', 'pink')
  })
})
