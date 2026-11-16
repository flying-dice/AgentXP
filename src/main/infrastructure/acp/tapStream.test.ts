import type { AnyMessage, Stream } from '@agentclientprotocol/sdk'
import { describe, expect, it } from 'vitest'
import { tapStream } from './tapStream'

const ping = (id: number): AnyMessage => ({ jsonrpc: '2.0', id, method: 'ping' }) as AnyMessage

function fakeStream(incoming: AnyMessage[]): { stream: Stream; written: AnyMessage[] } {
  const written: AnyMessage[] = []
  return {
    written,
    stream: {
      readable: new ReadableStream({
        start(controller) {
          incoming.forEach((m) => controller.enqueue(m))
          controller.close()
        }
      }),
      writable: new WritableStream({ write: (m) => void written.push(m) })
    }
  }
}

describe('tapStream', () => {
  it('shows every message in both directions and passes them through unchanged', async () => {
    const { stream, written } = fakeStream([ping(1), ping(2)])
    const seen: string[] = []
    const tapped = tapStream(stream, (direction, message) => seen.push(`${direction}:${(message as { id: number }).id}`))

    const read: AnyMessage[] = []
    for await (const m of tapped.readable) read.push(m)
    const writer = tapped.writable.getWriter()
    await writer.write(ping(3))
    await writer.close()
    await new Promise((r) => setTimeout(r, 10))

    expect(read).toEqual([ping(1), ping(2)])
    expect(written).toEqual([ping(3)])
    expect(seen).toEqual(['in:1', 'in:2', 'out:3'])
  })

  it('is not disturbed by a throwing tap', async () => {
    const { stream, written } = fakeStream([ping(1)])
    const tapped = tapStream(stream, () => {
      throw new Error('tap broke')
    })
    const read: AnyMessage[] = []
    for await (const m of tapped.readable) read.push(m)
    const writer = tapped.writable.getWriter()
    await writer.write(ping(2))
    await new Promise((r) => setTimeout(r, 10))
    expect(read).toHaveLength(1)
    expect(written).toEqual([ping(2)])
  })
})
