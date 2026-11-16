import { join } from 'node:path'
import { it } from 'vitest'
import { see, serveFixtureWeb, startScriptedDesktop } from './fixtures'
import { projectRoot } from './fixtures/launch'

it('debug', async () => {
  const web = await serveFixtureWeb()
  const ctx = await startScriptedDesktop({ script: join(projectRoot, 'e2e/fixtures/scripts/browser-agent.json'), title: 'dbg' })
  await ctx.desktop.openApp('browser')
  await ctx.desktop.openApp('chat')
  const chat = ctx.desktop.chat()
  await see.visible(chat.composer)
  await chat.send(`Use the chat app at ${web.origin}/`)
  await new Promise((r) => setTimeout(r, 40000))
  console.log('TRANSCRIPT', (await chat.transcript.innerText()).slice(-6000))
  await ctx.close()
  await web.close()
}, 120000)
