import { join } from 'node:path'
import { it } from 'vitest'
import { see, serveFixtureWeb, startScriptedDesktop } from './fixtures'
import { projectRoot } from './fixtures/launch'

it('debug', async () => {
  const web = await serveFixtureWeb()
  const ctx = await startScriptedDesktop({ script: join(projectRoot, 'e2e/fixtures/scripts/browser-agent.json'), title: 'dbg' })
  await ctx.desktop.openApp('browser')
  await see.visible(ctx.desktop.window('browser').getByTestId('browser-app'))
  await ctx.desktop.openApp('chat')
  const chat = ctx.desktop.chat()
  await see.visible(chat.composer)
  await chat.send(`Use the chat app at ${web.origin}/`)
  await new Promise((r) => setTimeout(r, 40000))
  const fs = await import('node:fs')
  fs.writeFileSync('/tmp/claude-0/-home-user/1fda1048-3ddd-50f7-a4e3-6c845af0af18/scratchpad/transcript.txt', await chat.transcript.innerText())
  await ctx.close()
  await web.close()
}, 120000)
