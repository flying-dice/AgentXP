import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { protocolEvents, see, startScriptedDesktop, type ScriptedDesktop } from './fixtures'

/** a2ui.json: the agent draws a WinForms surface with agent7.a2ui_render; the button's action comes back as a prompt. */
describe('scripted agent: A2UI surface (a2ui.json)', () => {
  let ctx: ScriptedDesktop

  beforeAll(async () => {
    ctx = await startScriptedDesktop({ script: 'a2ui', title: 'A2UI' })
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
  })
  afterAll(async () => ctx?.close())

  it('renders the surface in the chat with its controls', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('Show me a form')
    await see.visible(chat.surfaces)
    await see.visible(chat.surfaces.first().getByTestId('a2ui-textbox'))
    await see.visible(chat.surfaces.first().getByTestId('a2ui-checkbox'))
    await see.visible(chat.surfaces.first().getByTestId('a2ui-button').filter({ hasText: 'Send' }))
    await see.visible(chat.agentMessage('The form is on screen.'))
    await see.attribute(chat.transcript, 'data-running', 'false')
    expect(await chat.surfaces.count()).toBe(1)
  })

  it('typing and clicking Send returns the action (with the data model) to the agent, which answers', async () => {
    const chat = ctx.desktop.chat()
    const surface = chat.surfaces.first()
    await surface.getByTestId('a2ui-textbox').fill('Ann')
    await surface.getByTestId('a2ui-checkbox').click()
    await surface.getByTestId('a2ui-button').filter({ hasText: 'Send' }).click()
    await see.visible(chat.agentMessage('Got action send from send; hello Ann.'))
    await see.attribute(chat.transcript, 'data-running', 'false')
    // The action is a hidden prompt: no user message is added for it.
    expect(await chat.userMessages.count()).toBe(1)

    const sessionId = await chat.sessionId()
    const acp = await protocolEvents(ctx.desktopPage, { source: 'acp', sessionId })
    const prompts = acp.filter((e) => e.name === 'session/prompt')
    expect(prompts).toHaveLength(2)
    expect(prompts[1].payload).toContain('triggered the action \\"send\\"')
    expect(prompts[1].payload).toContain('\\"subscribe\\": true')
    await see.attribute(chat.toolCalls.first(), 'data-status', 'done')
  })
})
