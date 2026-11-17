import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Harness, script } from './testkit.ts'

const echoServer = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'echo-mcp.ts')
const agentxp = { name: 'agentxp', command: process.execPath, args: ['--experimental-strip-types', '--no-warnings', echoServer], env: [{ name: 'ELECTRON_RUN_AS_NODE', value: '1' }] }

let harness: Harness | null = null
afterEach(async () => {
  await harness?.dispose()
  harness = null
})

const run = async (steps: Parameters<typeof script>[0]['rules'][number]['steps']): Promise<Harness> => {
  harness = await new Harness(script({ rules: [{ id: 'r', match: { any: true }, steps }] })).start('/work', [agentxp])
  return harness
}

describe('mcpCall', () => {
  it('calls a tool of a session MCP server, reports it as a tool call and saves the text', async () => {
    const h = await run([
      { type: 'mcpCall', server: 'agentxp', tool: 'echo', arguments: { text: 'hi {{prompt}}' }, saveAs: 'r', id: 'call-1' },
      { type: 'expect', from: 'r', equals: 'echo: hi there' },
      { type: 'message', text: '{{r}} / {{r.isError}}' }
    ])
    expect(await h.prompt('there')).toBe('end_turn')
    expect(h.trace()).toEqual(['tool_call:call-1:in_progress', 'tool_call_update:call-1:completed', 'message:echo: hi there / false'])
    expect(h.updates('tool_call')[0]).toMatchObject({ title: 'agentxp.echo', rawInput: { text: 'hi there' } })
    expect(h.updates('tool_call_update')[0]).toMatchObject({ rawOutput: { text: 'echo: hi there', isError: false } })
  })

  it('treats a refusal as a result: failed tool call, text in the variable, turn continues', async () => {
    const h = await run([
      { type: 'mcpCall', server: 'agentxp', tool: 'refuse', saveAs: 'refusal' },
      { type: 'expect', from: 'refusal.isError', equals: 'true' },
      { type: 'expect', from: 'refusal', contains: 'is closed' }
    ])
    expect(await h.prompt('x')).toBe('end_turn')
    expect(h.trace()).toEqual(['tool_call:mcp-1:in_progress', 'tool_call_update:mcp-1:failed'])
  })

  it('report:false keeps the tool call out of the event stream', async () => {
    const h = await run([{ type: 'mcpCall', server: 'agentxp', tool: 'echo', report: false, saveAs: 'r' }, { type: 'message', text: '{{r}}' }])
    await h.prompt('x')
    expect(h.trace()).toEqual(['message:echo: '])
  })

  it('answers an unknown server or tool with an error result the script can check', async () => {
    const h = await run([
      { type: 'mcpCall', server: 'ghost', tool: 'echo', saveAs: 'a', report: false },
      { type: 'mcpCall', server: 'agentxp', tool: 'missing', saveAs: 'b', report: false },
      { type: 'message', text: '{{a}} | {{b}}' }
    ])
    await h.prompt('x')
    expect(h.trace()[0]).toContain('no MCP server named "ghost" in session/new (have: agentxp)')
    expect(h.trace()[0]).toContain('unknown tool missing')
  })
})
