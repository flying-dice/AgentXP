import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { A2uiServerMessage } from '@shared/a2ui'
import type { A2uiMessageSink } from '../../domain/a2ui/ports'
import { A2uiBridgeServer, defaultSocketPath } from './bridge-server'

const script = resolve('out/main/a2ui-mcp.js')

// Runs the built stdio server as a real child process; skipped until `electron-vite build` has run.
describe.skipIf(!existsSync(script))('built a2ui-mcp.js', () => {
  it('forwards a2ui_render over the socket', async () => {
    const received: { sessionKey: string; messages: A2uiServerMessage[] }[] = []
    const sink: A2uiMessageSink = {
      async apply(sessionKey, messages) {
        received.push({ sessionKey, messages })
        return { ok: true }
      }
    }
    const bridge = new A2uiBridgeServer(sink, defaultSocketPath(process.pid + 7))
    await bridge.start()
    const client = new Client({ name: 't', version: '0' })
    try {
      await client.connect(
        new StdioClientTransport({
          command: process.execPath,
          args: [script],
          env: { ...(process.env as Record<string, string>), AGENTXP_A2UI_SOCKET: bridge.socketPath, AGENTXP_SESSION_KEY: 'k1' }
        })
      )
      await client.callTool({ name: 'a2ui_render', arguments: { messages: [{ deleteSurface: { surfaceId: 'x' } }] } })
      expect(received).toEqual([{ sessionKey: 'k1', messages: [{ deleteSurface: { surfaceId: 'x' } }] }])
    } finally {
      await client.close()
      await bridge.stop()
    }
  })
})
