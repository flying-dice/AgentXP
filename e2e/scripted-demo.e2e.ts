import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  aguiRuns,
  allowTerminal,
  containsInOrder,
  createWorkspace,
  deltaPaths,
  messageShape,
  outcomeOf,
  plugWorkspaceIn,
  protocolEvents,
  protocolNames,
  see,
  startScriptedDesktop,
  type ScriptedDesktop,
  type Workspace
} from './fixtures'

/** Opens Terminal and Code (tools follow apps), plugs the project in and starts a chat on it from AutoPlay. */
async function startChat(ctx: ScriptedDesktop, workspace: Workspace): Promise<void> {
  await allowTerminal(ctx.desktopPage)
  await ctx.desktop.openApp('terminal')
  await ctx.desktop.openApp('code')
  await plugWorkspaceIn(ctx.desktopPage, ctx.desktopId, workspace)
  await ctx.desktopPage.getByTestId('autoplay-start-chat').click()
  await see.visible(ctx.desktop.chat().composer)
}

const files = { 'README.md': '# Demo project\n', 'package.json': '{"scripts":{"test":"echo tests-pass"}}\n' }

describe('scripted agent: demo.json, allow path', () => {
  let ctx: ScriptedDesktop
  let sessionId: number
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace(files)
    ctx = await startScriptedDesktop({ script: 'demo', title: 'Demo allow' })
    await startChat(ctx, workspace)
  })
  afterAll(async () => {
    await ctx?.close()
    await workspace?.remove()
  })

  it('streams the first part of the turn and suspends on the permission request', async () => {
    const chat = ctx.desktop.chat()
    sessionId = await chat.sessionId()
    await chat.send('Please do the work')
    await see.visible(chat.permissionDialog)
    await see.visible(chat.agentMessage('On it: Please do the work'))
    await see.text(chat.transcript, 'Thinking')
    await see.text(chat.toolCalls.first(), 'SCRIPTED.md')
    await see.attribute(chat.toolCalls.first(), 'data-status', 'waiting')
  })

  it('allowing runs the edit and the terminal command to the end', async () => {
    const chat = ctx.desktop.chat()
    await chat.answerPermission('allow')
    await see.visible(chat.agentMessage('Edit applied; npm test exited with 0.'))
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.count(chat.toolCalls, 2)
    await see.attribute(chat.toolCalls.first(), 'data-status', 'done')
    await see.attribute(chat.toolCalls.last(), 'data-status', 'done')
    await see.text(ctx.desktop.terminal().output, 'tests-pass')
  })

  it('AG-UI: the turn run ends in an interrupt, the resume run finishes', async () => {
    const events = await protocolEvents(ctx.desktopPage, { source: 'ag-ui', sessionId })
    const [connect, turn, resume, ...rest] = aguiRuns(events)
    expect(rest).toEqual([])
    // Opening the chat attaches an empty run first.
    expect(messageShape(connect)).toEqual(['RUN_STARTED', 'MESSAGES_SNAPSHOT', 'RUN_FINISHED'])

    expect(messageShape(turn)).toEqual([
      'RUN_STARTED',
      'TEXT_MESSAGE_START', 'TEXT_MESSAGE_CONTENT', 'TEXT_MESSAGE_END', // "On it: ..." (chunked)
      'REASONING_START', 'REASONING_MESSAGE_START', 'REASONING_MESSAGE_CONTENT', 'REASONING_MESSAGE_END', 'REASONING_END', // thought
      'TEXT_MESSAGE_START', 'TEXT_MESSAGE_CONTENT', 'TEXT_MESSAGE_END', // "Read README.md ..."
      'TOOL_CALL_START', 'TOOL_CALL_ARGS', 'TOOL_CALL_END', // the edit proposal
      'RUN_FINISHED'
    ])
    expect(turn.map((e) => e.name)).toContain('STATE_SNAPSHOT')
    expect(deltaPaths(turn)).toEqual(expect.arrayContaining(['/tasks/0', '/tasks/1', '/tasks/2', '/toolCalls/edit-1', '/session/status']))
    expect(outcomeOf(turn.at(-1))).toBe('interrupt')

    expect(messageShape(resume)).toEqual([
      'RUN_STARTED',
      'TOOL_CALL_RESULT', // the edit
      'TOOL_CALL_START', 'TOOL_CALL_ARGS', 'TOOL_CALL_END', 'TOOL_CALL_RESULT', // npm test
      'TEXT_MESSAGE_START', 'TEXT_MESSAGE_CONTENT', 'TEXT_MESSAGE_END', // "Edit applied ... Done."
      'RUN_FINISHED'
    ])
    expect(deltaPaths(resume)).toEqual(expect.arrayContaining(['/toolCalls/edit-1/status', '/changes/0', '/terminals/term-1/exitCode', '/toolCalls/test-1/status']))
    expect(outcomeOf(resume.at(-1))).toBe('success')
  })

  it('ACP: prompt, updates, file and terminal requests, permission in the order the script says', async () => {
    const acp = await protocolEvents(ctx.desktopPage, { source: 'acp', sessionId })
    const steps = acp.map((e) => {
      if (e.name !== 'session/update') return e.name
      return `update:${(JSON.parse(e.payload) as { params: { update: { sessionUpdate: string } } }).params.update.sessionUpdate}`
    })
    expect(
      containsInOrder(steps, [
        'session/prompt',
        'update:agent_message_chunk',
        'update:agent_thought_chunk',
        'update:plan',
        'fs/read_text_file',
        'update:tool_call',
        'session/request_permission',
        'update:tool_call_update',
        'fs/write_text_file',
        'update:tool_call_update',
        'update:tool_call',
        'terminal/create',
        'terminal/wait_for_exit',
        'terminal/release',
        'update:usage_update',
        'session/prompt (response)'
      ])
    ).toBe(true)
    const prompt = acp.find((e) => e.name === 'session/prompt (response)')
    expect(JSON.parse(prompt!.payload).result.stopReason).toBe('end_turn')
  })

  it('the Changes list shows the file the agent wrote', async () => {
    const chat = ctx.desktop.chat()
    await chat.showChanges()
    await see.text(chat.changes, 'SCRIPTED.md')
  })
})

describe('scripted agent: demo.json, deny path', () => {
  let ctx: ScriptedDesktop
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace(files)
    ctx = await startScriptedDesktop({ script: 'demo', title: 'Demo deny' })
    await startChat(ctx, workspace)
  })
  afterAll(async () => {
    await ctx?.close()
    await workspace?.remove()
  })

  it('denying takes the deny branch: no write, no terminal, the turn ends normally', async () => {
    const chat = ctx.desktop.chat()
    const sessionId = await chat.sessionId()
    await chat.send('Edit something')
    await see.visible(chat.permissionDialog)
    await chat.answerPermission('deny')
    await see.visible(chat.agentMessage('I left the files alone'))
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.count(chat.toolCalls, 1)
    await see.attribute(chat.toolCalls, 'data-status', 'failed')

    const acp = protocolNames(await protocolEvents(ctx.desktopPage, { source: 'acp', sessionId }))
    expect(acp).toContain('session/request_permission (response)')
    expect(acp).not.toContain('fs/write_text_file')
    expect(acp).not.toContain('terminal/create')

    const runs = aguiRuns(await protocolEvents(ctx.desktopPage, { source: 'ag-ui', sessionId }))
    const resume = runs.at(-1)!
    expect(messageShape(resume)).toEqual(['RUN_STARTED', 'TOOL_CALL_RESULT', 'TEXT_MESSAGE_START', 'TEXT_MESSAGE_CONTENT', 'TEXT_MESSAGE_END', 'RUN_FINISHED'])
    expect(outcomeOf(resume.at(-1))).toBe('success')
  })
})
