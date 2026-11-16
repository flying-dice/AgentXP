import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { launchAgent7, listAgents, see, setDefaultAgentByName, startConnectedDesktop, type ConnectedDesktop } from './fixtures'

/** The "Scripted Agent" that ships with the app: seeded once, runs the bundled script `demo` from the built app. */
describe('built-in Scripted Agent', () => {
  let userData: string
  let ctx: ConnectedDesktop

  beforeAll(async () => {
    userData = await mkdtemp(join(tmpdir(), 'a7-e2e-builtin-'))
    ctx = await startConnectedDesktop({ title: 'Built-in', userData, agent: (page) => setDefaultAgentByName(page, 'Scripted Agent') })
  })
  afterAll(async () => {
    await ctx?.app.close()
    await rm(userData, { recursive: true, force: true })
  })

  it('is registered with the bundled entry file, the demo script and node mode', async () => {
    const agent = (await listAgents(ctx.launcherPage)).find((a) => a.name === 'Scripted Agent')
    expect(agent).toBeDefined()
    expect(agent!.args[0]).toMatch(/out[\\/]main[\\/]scripted-agent\.js$/)
    expect(agent!.args.slice(1)).toEqual(['--script', 'demo'])
    expect(agent!.env).toMatchObject({ ELECTRON_RUN_AS_NODE: '1' })
  })

  it('answers the greeting of demo.json in a chat', async () => {
    await ctx.desktop.openApp('chat')
    const chat = ctx.desktop.chat()
    await chat.send('hello')
    await see.visible(chat.agentMessage('Hello from the scripted agent'))
    await see.attribute(chat.transcript, 'data-running', 'false')
  })

  it('is not added twice when the app restarts on the same data', async () => {
    await ctx.app.close()
    const again = await launchAgent7({ userData })
    try {
      const page = await again.launcherWindow()
      expect((await listAgents(page)).filter((a) => a.name === 'Scripted Agent')).toHaveLength(1)
    } finally {
      await again.close()
    }
  })
})
