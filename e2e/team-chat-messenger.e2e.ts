import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AgentXPApi } from '../src/shared/ipc'
import { see, setWindowSize, shot, startScriptedDesktop, type ScriptedDesktop } from './fixtures'

/**
 * Team Chat looks and works like a Windows Messenger conversation: a "To:" band naming the members, "Name says:" lines,
 * a format bar, the message box with a big Send button, and the "I want to..." side bar with the members and what they do.
 */
describe('Team Chat: a Messenger conversation', () => {
  let ctx: ScriptedDesktop
  let roomId: number
  const room = () => ctx.desktop.window('team-chat')

  const roomMessages = (): Promise<string[]> =>
    ctx.desktopPage.evaluate(async (id) => {
      const api = (window as unknown as { agentxp: AgentXPApi }).agentxp
      return (await api.rooms.state(id)).messages.map((m) => `${m.author}: ${m.text}`)
    }, roomId)

  beforeAll(async () => {
    ctx = await startScriptedDesktop({ teamsEnabled: true, script: 'e2e/fixtures/scripts/team-chat.json', title: 'Team Chat look' })
    roomId = await ctx.desktopPage.evaluate(async (desktopId) => {
      const api = (window as unknown as { agentxp: AgentXPApi }).agentxp
      const coder = await api.profiles.create({ name: 'Coder', instructions: '', agentId: null, model: null, skillIds: [], mcpServerIds: [] })
      const reviewer = await api.profiles.create({ name: 'Reviewer', instructions: '', agentId: null, model: null, skillIds: [], mcpServerIds: [] })
      const team = await api.teams.create({ name: 'Dev Team', instructions: '', skillIds: [], memberIds: [coder.id, reviewer.id], boardRef: null })
      const created = await api.rooms.create(desktopId, team.id)
      await api.desktop.openWindow({ desktopId, app: 'team-chat', roomId: created.id })
      return created.id
    }, ctx.desktopId)
    await see.visible(room().getByTestId('team-chat-app'))
  })
  afterAll(async () => ctx?.close())

  it('an empty room names its members and says how to start', async () => {
    await see.visible(room().getByTestId('team-chat-empty'))
    await see.count(room().getByTestId('team-chat-member'), 2)
    await see.text(room().getByTestId('team-chat-to'), /To:\s*Coder, Reviewer/)
    await see.text(room().getByTestId('team-chat-member-activity').first(), '(online)')
    await shot(ctx.desktopPage, 'team-chat-01-empty')
  })

  it('messages read "Name says:" and members show what they do', async () => {
    await room().getByTestId('team-chat-input').fill('@Coder please look at the change')
    await room().getByTestId('team-chat-send').click()
    await see.eventually(async () => expect((await roomMessages()).some((m) => m.startsWith('Coder: On it'))).toBe(true))
    await room().getByTestId('team-chat-input').fill('@Reviewer start the slow job')
    await room().getByTestId('team-chat-send').click()
    await see.attribute(room().getByTestId('team-chat-member').filter({ hasText: 'Reviewer' }), 'data-activity', 'thinking')
    await see.visible(room().getByTestId('team-chat-working'))
    await see.count(room().getByTestId('team-chat-message'), 3)
    await see.text(room().getByTestId('team-chat-message').first(), /You say:\s*@Coder please/)
    await see.text(room().getByTestId('team-chat-message').nth(1), /Coder says:\s*On it/)
    await see.text(room().getByTestId('status-strip'), /Last message received on \d+\.\d+\.\d{4} at \d\d:\d\d\./)
    await shot(ctx.desktopPage, 'team-chat-02-conversation')
  })

  it('the Call drop-down and "I want to..." add mentions; Stop every member stops the busy one', async () => {
    await room().getByTestId('team-chat-call').click()
    await see.visible(ctx.desktopPage.getByTestId('team-chat-call-all'))
    await shot(ctx.desktopPage, 'team-chat-03-call-menu')
    await ctx.desktopPage.getByTestId('team-chat-call-member').first().click()
    await see.eventually(async () => expect(await room().getByTestId('team-chat-input').inputValue()).toBe('@Coder '))
    await room().getByTestId('team-chat-task-call-all').click()
    await see.eventually(async () => expect(await room().getByTestId('team-chat-input').inputValue()).toBe('@Coder @all '))
    await room().getByTestId('team-chat-input').fill('')
    await room().getByTestId('team-chat-task-stop-all').click()
    await see.attribute(room().getByTestId('team-chat-member').filter({ hasText: 'Reviewer' }), 'data-activity', 'idle')
    await see.gone(room().getByTestId('team-chat-working'))
  })

  it('Show session opens the member\'s chat beside the room, maximized and in a small window', async () => {
    await room().getByTestId('team-chat-member-session').first().click()
    await see.visible(room().getByTestId('team-chat-session-panel'))
    await see.text(room().getByTestId('team-chat-member-session').first(), 'Hide session')
    await room().getByTestId('window-maximize').click()
    await shot(ctx.desktopPage, 'team-chat-04-session-maximized')
    await room().getByTestId('team-chat-member-session').first().click()
    await see.gone(room().getByTestId('team-chat-session-panel'))
    await setWindowSize(ctx.app, ctx.desktopPage, 900, 600)
    await shot(ctx.desktopPage, 'team-chat-05-small')
  })
})
