import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { A2uiServerMessage } from '@shared/a2ui'
import type { A2uiMessageSink } from '../../domain/a2ui/ports'
import { ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js'
import type { DesktopToolHost } from '../../application/tools/types'
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
      expect(received).toEqual([{ sessionKey: 'k1', messages: [{ version: 'v0.9', deleteSurface: { surfaceId: 'x' } }] }])
    } finally {
      await client.close()
      await bridge.stop()
    }
  })

  it('serves desktop tools and sends tools/list_changed when the desktop changes', async () => {
    let groups: ('shell' | 'terminal')[] = ['shell']
    const host: DesktopToolHost = {
      enabledGroups: () => groups,
      call: async (context, tool) => ({ content: [{ type: 'text', text: `${tool}@${context.sessionId}/${context.desktopId}` }] })
    }
    const bridge = new A2uiBridgeServer({ apply: async () => ({ ok: true }) }, defaultSocketPath(process.pid + 8), undefined, host)
    await bridge.start()
    const client = new Client({ name: 't', version: '0' })
    let changed = 0
    client.setNotificationHandler(ToolListChangedNotificationSchema, () => void changed++)
    try {
      await client.connect(
        new StdioClientTransport({
          command: process.execPath,
          args: [script],
          env: {
            ...(process.env as Record<string, string>),
            AGENTXP_A2UI_SOCKET: bridge.socketPath,
            AGENTXP_SESSION_KEY: '11',
            AGENTXP_DESKTOP_ID: '4'
          }
        })
      )
      expect(client.getServerCapabilities()?.tools?.listChanged).toBe(true)
      expect(client.getServerVersion()?.name).toBe('agentxp')
      expect((await client.listTools()).tools.map((t) => t.name)).toContain('desktop_state')
      for (let i = 0; i < 300 && bridge.subscriberCount(4) === 0; i++) await new Promise((r) => setTimeout(r, 10))
      groups = ['shell', 'terminal']
      bridge.publishTools(4, groups)
      for (let i = 0; i < 300 && changed === 0; i++) await new Promise((r) => setTimeout(r, 10))
      expect(changed).toBe(1)
      expect((await client.listTools()).tools.map((t) => t.name)).toContain('terminal_run')
      expect(await client.callTool({ name: 'desktop_state', arguments: {} })).toMatchObject({ content: [{ text: 'desktop_state@11/4' }] })
    } finally {
      await client.close()
      await bridge.stop()
    }
  })
})
