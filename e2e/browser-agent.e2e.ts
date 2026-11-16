import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { see, serveFixtureWeb, startScriptedDesktop, type ScriptedDesktop, type WebServer } from './fixtures'
import { projectRoot } from './fixtures/launch'

/**
 * browser-agent.json: the scripted agent uses a local team-chat web page (e2e/fixtures/web/chat-app.html) through the
 * browser_* tools like it would use a real chat web app: read the tree, switch channel, scroll up to load older
 * messages, type into a contenteditable composer, press Enter, search in an iframe, click a shadow-DOM button, use tabs.
 * The page lives in a webview, so the spec checks it through what the agent reads back (the script's `expect` steps fail
 * the turn when the page does not look right) and through the Browser window's own controls.
 */
/** Waits for an agent message; when it never comes, fails with the transcript (the script's own failure text is in it). */
async function agentSays(ctx: ScriptedDesktop, text: string): Promise<void> {
  const chat = ctx.desktop.chat()
  try {
    await see.visible(chat.agentMessage(text))
  } catch {
    throw new Error(`The agent never said "${text}". Transcript:\n${(await chat.transcript.innerText()).slice(-3000)}`)
  }
}

describe('Browser agent: a local chat web app', () => {
  let ctx: ScriptedDesktop
  let web: WebServer

  beforeAll(async () => {
    web = await serveFixtureWeb()
    ctx = await startScriptedDesktop({ script: join(projectRoot, 'e2e/fixtures/scripts/browser-agent.json'), title: 'Browser agent' })
    await ctx.desktop.openApp('browser')
    await see.visible(ctx.desktop.window('browser').getByTestId('browser-app'))
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
  })
  afterAll(async () => {
    await ctx?.close()
    await web?.close()
  })

  it('reads the tree, switches channel, loads older messages, sends from the contenteditable composer and uses the iframe and shadow DOM', async () => {
    const chat = ctx.desktop.chat()
    const browser = ctx.desktop.window('browser')
    await chat.send(`Use the chat app at ${web.origin}/`)

    // While the agent works, the Browser window says so and rings its target.
    await see.visible(browser.getByTestId('browser-agent-bar'))
    await see.text(browser.getByTestId('browser-agent-bar'), 'Agent is using this page')

    // The last step is a message that quotes the agent's own message as the page shows it.
    await agentSays(ctx, 'DONE')
    await see.text(chat.agentMessage('DONE'), 'You Second message via submit')
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.count(chat.errors, 0)

    // The page the agent drove is the page of the window.
    await see.eventually(async () => expect(await browser.getByTestId('browser-address').inputValue()).toContain(web.origin))
    await see.text(browser.getByTestId('browser-tab-1'), 'Team Chat Fixture')
    await see.visible(browser.getByTestId('browser-refresh'))
  })

  it('the agent manages tabs and the tab strip follows', async () => {
    const chat = ctx.desktop.chat()
    const browser = ctx.desktop.window('browser')
    await ctx.desktop.taskbarItem('chat').click() // the Browser window came to the front when the agent first used it
    await chat.send(`Check the tabs at ${web.origin}/`)
    await agentSays(ctx, 'TABS OK')
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.visible(browser.getByTestId('browser-tab-1'))
    await see.gone(browser.getByTestId('browser-tab-2'))
    await see.attribute(browser.getByTestId('browser-tab-1'), 'data-active', 'true')
  })

  it('the user opens and closes tabs with the tab strip', async () => {
    const browser = ctx.desktop.window('browser')
    await ctx.desktop.closeWindow('chat') // it is tiled over part of the Browser window
    await browser.getByTestId('browser-tab-new').click()
    const created = browser.getByTestId('browser-tab-3')
    await see.visible(created)
    await see.attribute(created, 'data-active', 'true')
    await see.attribute(browser.getByTestId('browser-tab-1'), 'data-active', 'false')
    await see.text(created, 'New Tab')
    await see.text(browser.getByTestId('browser-start-page'), 'Type an address above to open a page.')
    await browser.getByTestId('browser-tab-close-3').click()
    await see.gone(browser.getByTestId('browser-tab-3'))
    await see.attribute(browser.getByTestId('browser-tab-1'), 'data-active', 'true')
  })

  it('an address that cannot be reached shows the error page with the cause, and Refresh tries again', async () => {
    const browser = ctx.desktop.window('browser')
    await browser.getByTestId('browser-address').fill('127.0.0.1:9')
    await browser.getByTestId('browser-go').click()
    await see.text(browser.getByTestId('browser-error-title'), "This page can't be displayed")
    await see.text(browser.getByTestId('browser-error-cause'), "The address '127.0.0.1:9' could not be reached.")
    await see.visible(browser.getByTestId('browser-error-help'))
    await browser.getByTestId('browser-error-refresh').click()
    await see.text(browser.getByTestId('browser-error-title'), "This page can't be displayed")
    // A good address clears the error page.
    await browser.getByTestId('browser-address').fill(`${web.origin}/`)
    await browser.getByTestId('browser-go').click()
    await see.gone(browser.getByTestId('browser-error-page'))
  })
})
