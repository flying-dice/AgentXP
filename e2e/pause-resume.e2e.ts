import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { see, startScriptedDesktop, type ScriptedDesktop } from './fixtures'
import type { ControlClient } from '../agents/scripted-agent/controlClient'

/** UX-59 and UX-60: Pause saves the stopped step, Resume continues it, and taking control stops the agent with a way back. */
describe('pause, resume and taking control (stepping agent)', () => {
  let ctx: ScriptedDesktop
  let control: ControlClient

  beforeAll(async () => {
    ctx = await startScriptedDesktop({ script: 'stepping', stepMode: 'manual', title: 'Pause desktop' })
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
  })
  afterAll(async () => ctx?.close())

  it('Pause stops the running step; the chat and the Action Center say it continues on Resume', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('step through')
    control = await ctx.scripted.control()
    await control.waitForPause()
    await see.attribute(chat.transcript, 'data-running', 'true')
    await ctx.desktop.pauseButton.click()
    await see.text(ctx.desktop.status, 'Paused: no agent will act until you resume.')
    await see.text(ctx.desktop.pauseButton, 'Resume agents and continue')
    const banner = chat.frame.getByTestId('chat-paused-banner')
    await see.attribute(banner, 'data-stopped', 'true')
    await see.text(banner, 'It continues when you click Resume agents and continue.')
    await ctx.desktop.openActionCenter()
    await see.text(ctx.desktopPage.getByTestId('action-center-message'), 'Paused. The step that was running was stopped.')
    await ctx.desktop.actionCenterFlag.click()
  })

  it('one click on Resume continues the stopped step without typing: the chat shows the note and a new turn finishes', async () => {
    const chat = ctx.desktop.chat()
    await ctx.desktop.pauseButton.click()
    await see.text(chat.frame.getByTestId('chat-resume-note'), 'Resumed. Continuing where you stopped.')
    await see.text(chat.userMessages.last(), 'Please continue where you stopped.')
    await see.attribute(ctx.desktop.topBar, 'data-state', 'working')
    await control.waitForPause()
    await control.setMode('auto')
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.text(chat.agentMessages.last(), 'All steps done.')
  })

  it('taking control stops the running step, the chat does not read Working, and Give control back returns', async () => {
    const chat = ctx.desktop.chat()
    await control.setMode('manual')
    await chat.send('step through again')
    await control.waitForPause()
    await ctx.desktopPage.getByTestId('topbar-take-control').click()
    await see.text(ctx.desktop.status, 'You are in control. Tools that need an app ask first. Terminal and Browser are not open.')
    await see.text(ctx.desktopPage.getByTestId('gadget-activity-control'), 'Stopped: you took control')
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.eventually(async () => expect(await chat.frame.getByTestId('chat-status').innerText()).not.toContain('Working'))
    await ctx.desktopPage.getByTestId('topbar-give-back').click()
    await see.gone(ctx.desktopPage.getByTestId('topbar-give-back'))
    await see.text(ctx.desktop.status, 'Idle')
  })

  it('closing a chat while the agent works says that the agent keeps working (UX-136)', async () => {
    const chat = ctx.desktop.chat()
    await control.setMode('manual')
    await chat.send('step through once more')
    await control.waitForPause()
    await see.attribute(chat.transcript, 'data-running', 'true')
    await ctx.desktop.closeWindow('chat')
    await see.text(ctx.desktop.balloonText, 'The agent keeps working. Open it again from the Task Manager.')
    await control.setMode('auto')
  })
})
