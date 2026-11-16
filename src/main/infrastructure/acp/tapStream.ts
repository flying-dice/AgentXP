import type { AnyMessage, Stream } from '@agentclientprotocol/sdk'
import type { ProtocolTap } from '../../application/ports'

/**
 * Wraps an ACP stream so `tap` sees every JSON-RPC message in both directions
 * (`in`: read from the agent, `out`: written to it) without changing what flows through.
 * A throwing tap never disturbs the connection.
 */
export function tapStream(stream: Stream, tap: ProtocolTap): Stream {
  const seen = (direction: 'in' | 'out') =>
    new TransformStream<AnyMessage, AnyMessage>({
      transform(message, controller) {
        try {
          tap(direction, message)
        } catch (error) {
          console.error('Protocol tap failed', error)
        }
        controller.enqueue(message)
      }
    })
  const outgoing = seen('out')
  void outgoing.readable.pipeTo(stream.writable).catch(() => {})
  return { readable: stream.readable.pipeThrough(seen('in')), writable: outgoing.writable }
}
