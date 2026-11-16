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
    // F1 opens the topic at its top, so its title is the first line (UX-148).
    await see.eventually(async () => {
      expect(await help.getByTestId('help-article').evaluate((el) => (el as HTMLElement).scrollTop)).toBe(0)
    })
    // The whole Help window lies inside the desktop (UX-148).
    await see.eventually(async () => {
      const frame = (await help.boundingBox())!
      const viewport = await ctx.desktopPage.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
      expect(frame.x).toBeGreaterThanOrEqual(0)
      expect(frame.y).toBeGreaterThanOrEqual(0)
      expect(frame.x + frame.width).toBeLessThanOrEqual(viewport.width + 1)
      expect(frame.y + frame.height).toBeLessThanOrEqual(viewport.height + 1)
    })
    // The Table of Contents lists the sections of one chapter only (the other chapters are one line each).
    expect(await help.getByTestId('help-toc-open').count()).toBeLessThanOrEqual(1)
  })

  it('F1 on another window moves the same Help window to its topic', async () => {
    await ctx.desktop.openApp('terminal')
    await ctx.desktop.focusWindow('terminal')
    await see.attribute(ctx.desktop.window('terminal'), 'data-focused', 'true')
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
    await see.visible(help.getByTestId('help-result').first())
    await see.count(topics, 0)
    await help.getByTestId('help-search').fill('zzzzqqqq')
    await see.count(help.getByTestId('help-result'), 0)
    await see.visible(help.getByTestId('help-no-results'))
    await help.getByTestId('help-search').fill('')
    await see.eventually(async () => expect(await topics.count()).toBe(all))
    await topics.filter({ hasText: 'Using Notepad' }).click()
    await help.getByTestId('help-home').click()
    await see.eventually(async () => expect(await help.getByTestId('help-article').getAttribute('data-topic')).toBe('index'))
  })

  it('the status bar names the topic once, the contents list "Save a file", and a jump shows the heading whole (UX-183)', async () => {
    const help = ctx.desktop.window('help')
    await help.getByTestId('help-topic').filter({ hasText: 'Using Notepad' }).click()
    await see.attribute(help.getByTestId('help-article'), 'data-topic', 'notepad')
    await see.text(help.getByTestId('help-status'), 'Using Notepad')
    expect(await help.getByTestId('help-status-topic').innerText()).not.toContain('Using Notepad')
    await help.getByTestId('help-contents-link').filter({ hasText: /^Save a file$/ }).first().click()
    await see.visible(help.getByTestId('help-target'))
    await see.text(help.getByTestId('help-status-topic'), 'Save a file')
    await see.eventually(async () => {
      const heading = (await help.getByTestId('help-target').boundingBox())!
      const article = (await help.getByTestId('help-article').boundingBox())!
      expect(heading.y - article.y).toBeGreaterThanOrEqual(0)
      expect(heading.y - article.y).toBeLessThan(article.height / 2)
    })
    await help.getByTestId('help-home').click()
  })

  it('opens from the Start menu', async () => {
    await ctx.desktop.closeWindow('help')
    await see.count(ctx.desktop.windows('help'), 0)
    const help = await ctx.desktop.openHelp()
    await see.visible(help.getByTestId('help-article'))
  })

  it('a search result opens its section by one click (UX-80)', async () => {
    const help = ctx.desktop.window('help')
    await help.getByTestId('help-search').fill('Restore this item')
    const result = help.getByTestId('help-result').filter({ hasText: 'Using Chat' }).first()
    await see.visible(result)
    await result.click()
    await see.attribute(help.getByTestId('help-article'), 'data-topic', 'chat')
    await see.eventually(async () => {
      const scrolled = await help.getByTestId('help-article').evaluate((el) => (el as HTMLElement).scrollTop)
      expect(scrolled).toBeGreaterThan(0)
    })
    await help.getByTestId('help-search').fill('')
  })

  it('"undo" lists the Revert section first, with its title and its manual (UX-110)', async () => {
    const help = ctx.desktop.window('help')
    await help.getByTestId('help-search').fill('undo')
    const first = help.getByTestId('help-result').first()
    await see.visible(first)
    await see.text(first, 'Undo a Change of the Agent (Revert)')
    await see.text(first.getByTestId('help-result-topic'), 'Using Chat')
    await first.click()
    await see.attribute(help.getByTestId('help-article'), 'data-topic', 'chat')
    await help.getByTestId('help-search').fill('')
  })

  it('Help takes the keyboard focus and Esc closes it (UX-80)', async () => {
    await ctx.desktop.closeWindow('help')
    const help = await ctx.desktop.openHelp()
    await see.eventually(async () => {
      expect(await help.getByTestId('help-search').evaluate((el) => el === document.activeElement)).toBe(true)
    })
    await ctx.desktopPage.keyboard.press('Escape')
    await see.count(ctx.desktop.windows('help'), 0)
  })

  it('F1 with no window focused opens Using the Desktop (UX-81, UX-165)', async () => {
    await ctx.desktop.closeWindow('terminal')
    await ctx.desktop.closeWindow('notepad')
    await ctx.desktopPage.keyboard.press('F1')
    const help = ctx.desktop.window('help')
    await see.visible(help.getByTestId('help-app'))
    await see.attribute(help.getByTestId('help-article'), 'data-topic', 'desktop')
  })
})
