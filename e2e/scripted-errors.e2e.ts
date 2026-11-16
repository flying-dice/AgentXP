import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { aguiRuns, messageShape, outcomeOf, payloadOf, protocolEvents, see, startScriptedDesktop, type ScriptedDesktop } from './fixtures'

/** errors.json: failure paths picked by words in the prompt. */
describe('scripted agent: failures and stop reasons (errors.json)', () => {
  let ctx: ScriptedDesktop
  let sessionId: number

  beforeAll(async () => {
    ctx = await startScriptedDesktop({ script: 'errors', title: 'Errors' })
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
    sessionId = await ctx.desktop.chat().sessionId()
  })
  afterAll(async () => ctx?.close())

  /** The `stopReason` of the nth `session/prompt` response of the chat. */
  const stopReason = async (nth: number): Promise<string | undefined> => {
    const acp = await protocolEvents(ctx.desktopPage, { source: 'acp', sessionId })
    const answer = acp.filter((e) => e.name === 'session/prompt (response)')[nth]
    return answer && (payloadOf<{ result?: { stopReason: string } }>(answer).result?.stopReason)
  }

  it('an error step shows an error row and the run ends with RUN_ERROR', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('please error out')
    await see.visible(chat.errors)
    await see.text(chat.errors, 'Scripted failure')
    await see.visible(chat.agentMessage('About to fail.'))
    await see.attribute(chat.transcript, 'data-running', 'false')

    const acp = await protocolEvents(ctx.desktopPage, { source: 'acp', sessionId })
    const failed = acp.find((e) => e.name === 'session/prompt (response)')!
    expect(failed.level).toBe('error')
    expect(payloadOf<{ error: { code: number; message: string } }>(failed).error).toMatchObject({ code: -32603, message: 'Scripted failure' })
    const last = aguiRuns(await protocolEvents(ctx.desktopPage, { source: 'ag-ui', sessionId })).at(-1)!
    expect(messageShape(last).at(-1)).toBe('RUN_ERROR')
  })

  it('a refusal ends the turn with stopReason refusal (logged as a warning)', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('please refuse this')
    await see.visible(chat.agentMessage("I can't help with that."))
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.eventually(async () => expect(await stopReason(1)).toBe('refusal'))
    const acp = await protocolEvents(ctx.desktopPage, { source: 'acp', sessionId })
    expect(acp.filter((e) => e.name === 'session/prompt (response)')[1].level).toBe('warning')
  })

  it('max_tokens ends the turn with the cut-off text (stopReason max_tokens)', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('write something long')
    await see.visible(chat.agentMessage('This answer is cut o'))
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.eventually(async () => expect(await stopReason(2)).toBe('max_tokens'))
  })

  it('a scripted cancelled stop reason finishes the run as cancelled', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('this ends cancelled')
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.eventually(async () => expect(await stopReason(3)).toBe('cancelled'))
    const last = aguiRuns(await protocolEvents(ctx.desktopPage, { source: 'ag-ui', sessionId })).at(-1)!
    expect(outcomeOf(last.at(-1))).toBe('cancelled')
  })

  it('a failed expect step and an unknown {{variable}} fail the turn with their message', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('please expect something')
    await see.text(chat.errors.last(), 'Scripted expectation failed')
    await chat.send('check the template')
    await see.text(chat.errors.last(), 'nobody')
    await see.attribute(chat.transcript, 'data-running', 'false')
  })

  it('Stop interrupts a long wait: the turn ends cancelled', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('be slow')
    await see.visible(chat.agentMessage('Waiting...'))
    await see.enabled(chat.stop)
    await chat.stop.click()
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.eventually(async () => expect(await stopReason(6)).toBe('cancelled'))
  })
})
