import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { protocolEvents, see, startScriptedDesktop, type ChatWindow, type ScriptedDesktop } from './fixtures'
import type { ControlClient } from '../agents/scripted-agent/controlClient'

/** Everything stepping.json can make visible, as counts: the UI must change by exactly one of these per `next()`. */
async function visible(chat: ChatWindow): Promise<{ messages: number; reasoning: number; tasks: number; tools: number; toolStatus: string }> {
  return {
    messages: await chat.agentMessages.count(),
    reasoning: await chat.reasoning.count(),
    tasks: await chat.tasks.count(),
    tools: await chat.toolCalls.count(),
    toolStatus: (await chat.toolCalls.count()) > 0 ? ((await chat.toolCalls.first().getAttribute('data-status')) ?? '') : ''
  }
}

describe('scripted agent: manual stepping (stepping.json)', () => {
  let ctx: ScriptedDesktop
  let control: ControlClient

  beforeAll(async () => {
    ctx = await startScriptedDesktop({ script: 'stepping', stepMode: 'manual', title: 'Stepping' })
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
  })
  afterAll(async () => ctx?.close())

  it('the turn pauses before the first step and nothing is shown yet', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('step through')
    await see.text(chat.userMessages, 'step through')
    control = await ctx.scripted.control()
    const paused = await control.waitForPause()
    expect(paused).toMatchObject({ state: 'paused', stepIndex: 0, label: 'first message', stepType: 'message', script: 'stepping' })
    await chat.showTasks()
    expect(await visible(chat)).toEqual({ messages: 0, reasoning: 0, tasks: 0, tools: 0, toolStatus: '' })
  })

  it('every next() adds exactly one visible change, and status() names the step it waits before', async () => {
    const chat = ctx.desktop.chat()
    // [label the agent now waits before, what is visible after the step that just ran]
    const steps: [string, { messages: number; reasoning: number; tasks: number; tools: number; toolStatus: string }][] = [
      ['thought', { messages: 1, reasoning: 0, tasks: 0, tools: 0, toolStatus: '' }],
      ['plan', { messages: 1, reasoning: 1, tasks: 0, tools: 0, toolStatus: '' }],
      ['tool start', { messages: 1, reasoning: 1, tasks: 1, tools: 0, toolStatus: '' }],
      ['tool end', { messages: 1, reasoning: 1, tasks: 1, tools: 1, toolStatus: 'running' }],
      ['last message', { messages: 1, reasoning: 1, tasks: 1, tools: 1, toolStatus: 'done' }]
    ]
    for (const [label, expected] of steps) {
      expect(await control.next()).toBe(true)
      const paused = await control.waitForPause()
      expect(paused.label).toBe(label)
      await see.eventually(async () => expect(await visible(chat)).toEqual(expected))
    }
  })

  it('the last step ends the turn: the second message arrives and the chat is idle', async () => {
    const chat = ctx.desktop.chat()
    expect(await control.next()).toBe(true)
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.eventually(async () => expect(await chat.agentMessages.count()).toBe(2))
    await see.text(chat.agentMessages.last(), 'All steps done.')
    await see.eventually(async () => expect(control.events.filter((e) => e.event === 'turn_ended')).toMatchObject([{ stopReason: 'end_turn' }]))
    // `next` keeps no credit: nothing is paused any more.
    expect(await control.next()).toBe(false)
  })

  it('auto mode runs a whole turn without pausing', async () => {
    const chat = ctx.desktop.chat()
    await control.setMode('auto')
    await chat.send('run it all')
    await see.eventually(async () => expect(await chat.agentMessages.count()).toBe(4))
    await see.count(chat.reasoning, 2)
    // The script reuses the tool call id `t1` in every turn: each turn gets its own card.
    await see.count(chat.toolCalls, 2)
    await see.attribute(chat.toolCalls.first(), 'data-status', 'done')
    await see.attribute(chat.toolCalls.last(), 'data-status', 'done')
    expect((await control.status()).state).toBe('idle')
  })
})

describe('scripted agent: Stop while a step is paused (stepping.json)', () => {
  let ctx: ScriptedDesktop

  beforeAll(async () => {
    ctx = await startScriptedDesktop({ script: 'stepping', stepMode: 'manual', title: 'Cancel' })
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
  })
  afterAll(async () => ctx?.close())

  it('Stop ends the turn with stopReason cancelled and the running tool call shows as cancelled', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('stop me')
    const sessionId = await chat.sessionId()
    const control = await ctx.scripted.control()
    // Run up to the tool call (steps 0..3), then stop while the agent waits before "tool end".
    for (const label of ['first message', 'thought', 'plan', 'tool start']) {
      expect((await control.waitForPause()).label).toBe(label)
      await control.next()
    }
    expect((await control.waitForPause()).label).toBe('tool end')
    await see.attribute(chat.toolCalls.first(), 'data-status', 'running')
    await see.enabled(chat.stop)

    await chat.stop.click()
    await see.attribute(chat.toolCalls.first(), 'data-status', 'cancelled')
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.eventually(async () => expect(control.events.filter((e) => e.event === 'turn_ended').at(-1)).toMatchObject({ stopReason: 'cancelled' }))
    await see.text(chat.toolCalls.first(), 'Cancelled')

    await see.eventually(async () => {
      const acp = await protocolEvents(ctx.desktopPage, { source: 'acp', sessionId })
      expect(acp.map((e) => e.name)).toContain('session/cancel')
      const answer = acp.find((e) => e.name === 'session/prompt (response)')
      expect(JSON.parse(answer!.payload).result.stopReason).toBe('cancelled')
    })
    // The agent is free again: the script's `next` finds nothing to release.
    expect(await control.next()).toBe(false)
  })
})
