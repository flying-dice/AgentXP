import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { see, startConnectedDesktop, type ConnectedDesktop } from './fixtures'

/** F1 opens Help and Support on the topic of the focused window; the search box filters the topics. */
describe('Help and Support', () => {
  let ctx: ConnectedDesktop

  beforeAll(async () => {
    ctx = await startConnectedDesktop({ title: 'Help desktop' })
  })
  afterAll(async () => {
    await ctx?.app.close()
  })

  it('F1 on a focused Notepad opens the notepad topic', async () => {
    await ctx.desktop.openApp('notepad')
    await ctx.desktop.focusWindow('notepad')
    await ctx.desktopPage.keyboard.press('F1')
    const help = ctx.desktop.window('help')
    await see.visible(help.getByTestId('help-app'))
    await see.attribute(help.getByTestId('help-article'), 'data-topic', 'notepad')
    await see.text(help.getByTestId('help-article'), 'Using Notepad')
  })

  it('F1 on another window moves the same Help window to its topic', async () => {
    await ctx.desktop.openApp('terminal')
    await ctx.desktop.focusWindow('terminal')
    await ctx.desktopPage.keyboard.press('F1')
    await see.count(ctx.desktop.windows('help'), 1)
    await see.eventually(async () => expect(await ctx.desktop.window('help').getByTestId('help-article').getAttribute('data-topic')).toBe('terminal'))
  })

  it('the search box filters the topic list and Home shows all topics again', async () => {
    const help = ctx.desktop.window('help')
    const topics = help.getByTestId('help-topic')
    await see.visible(topics.first())
    const all = await topics.count()
    await help.getByTestId('help-search').fill('Ctrl+S')
    await see.eventually(async () => expect(await topics.count()).toBeLessThan(all))
    await help.getByTestId('help-search').fill('zzzzqqqq')
    await see.count(topics, 0)
    await see.visible(help.getByTestId('help-no-results'))
    await help.getByTestId('help-search').fill('')
    await see.eventually(async () => expect(await topics.count()).toBe(all))
    await topics.filter({ hasText: 'Using Notepad' }).click()
    await help.getByTestId('help-home').click()
    await see.eventually(async () => expect(await help.getByTestId('help-article').getAttribute('data-topic')).toBe('index'))
  })

  it('opens from the Start menu', async () => {
    await ctx.desktop.closeWindow('help')
    await see.count(ctx.desktop.windows('help'), 0)
    const help = await ctx.desktop.openHelp()
    await see.visible(help.getByTestId('help-article'))
  })
})
