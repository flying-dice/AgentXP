import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AgentXPApi } from '../src/shared/ipc'
import { see, shot, startScriptedDesktop, type ScriptedDesktop } from './fixtures'

/**
 * A team room member works in the background: main prompts its session, no chat window starts the turn. Its permission
 * requests still pop up over the desktop, and its Session pane follows the turn live (desktop.json: the member opens the
 * Terminal and runs a command, which "Run commands: Ask first" makes it ask for).
 */
describe('Team room: what a member does in the background shows on the desktop', () => {
  let ctx: ScriptedDesktop
  let roomId: number

  const roomMessages = (): Promise<string> =>
    ctx.desktopPage.evaluate(async (id) => {
      const api = (window as unknown as { agentxp: AgentXPApi }).agentxp
      return (await api.rooms.state(id)).messages.map((m) => `${m.author}: ${m.text}`).join('\n')
    }, roomId)
  const room = () => ctx.desktop.window('team-chat')
  const popup = () => ctx.desktopPage.getByTestId('uac-dialog')

  beforeAll(async () => {
    ctx = await startScriptedDesktop({ script: 'desktop', title: 'Room approvals' })
    roomId = await ctx.desktopPage.evaluate(async (desktopId) => {
      const api = (window as unknown as { agentxp: AgentXPApi }).agentxp
      const tester = await api.profiles.create({ name: 'Tester', instructions: '', agentId: null, model: null, skillIds: [], mcpServerIds: [] })
      const team = await api.teams.create({ name: 'Dev', instructions: '', skillIds: [], memberIds: [tester.id], boardRef: null })
      const created = await api.rooms.create(desktopId, team.id)
      await api.desktop.openWindow({ desktopId, app: 'team-chat', roomId: created.id })
      return created.id
    }, ctx.desktopId)
    await see.visible(room().getByTestId('team-chat-app'))
  })
  afterAll(async () => ctx?.close())

  it('a member\'s permission request pops up over the desktop; Allow lets it finish and answer in the room', async () => {
    await room().getByTestId('team-chat-input').fill('please run it')
    await room().getByTestId('team-chat-send').click()
    await see.attribute(room().getByTestId('team-chat-member'), 'data-activity', 'waiting')
    await see.visible(popup())
    // It says who asks, where and what, in plain words (no tool name).
    await see.text(ctx.desktopPage.getByTestId('uac-question'), 'Allow Tester to run a command?')
    await see.text(ctx.desktopPage.getByTestId('uac-from'), 'Requested by Tester in the room Dev')
    await shot(ctx.desktopPage, 'team-room-01-approval')
    await ctx.desktopPage.getByTestId('uac-allow').click()
    await see.gone(popup())
    await see.eventually(async () => expect(await roomMessages()).toContain('Tester: The terminal printed'))
    await see.attribute(room().getByTestId('team-chat-member'), 'data-activity', 'idle')
  })

  it('the member\'s Session pane, opened before the next turn, follows that turn live', async () => {
    // The Terminal the member opened comes to the front while the focus stays in the room (UX-55): put it away.
    await ctx.desktop.minimizeWindow('terminal')
    await room().getByTestId('team-chat-member-session').click()
    const pane = room().getByTestId('team-chat-session-panel')
    await see.visible(pane)
    const cardsBefore = await pane.getByTestId('tool-call-card').count()
    await room().getByTestId('team-chat-input').fill('@Tester again please')
    await room().getByTestId('team-chat-send').click()
    // While the member waits for the answer, the pane already shows this turn's steps (the Terminal opened, the command asked).
    await see.visible(popup())
    await see.eventually(async () => expect(await pane.getByTestId('tool-call-card').count()).toBeGreaterThan(cardsBefore))
    await shot(ctx.desktopPage, 'team-room-02-session-live')
    await ctx.desktopPage.getByTestId('uac-allow').click()
    await see.eventually(async () => expect((await roomMessages()).match(/Tester: The terminal printed/g)?.length).toBe(2))
  })
})
