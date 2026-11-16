import { connect } from 'node:net'
import { randomUUID } from 'node:crypto'
import { LineSplitter } from './ndjson'
import type { BridgeRequest, BridgeResponse } from './protocol'

export interface A2uiForwarder {
  forward(messages: unknown[]): Promise<BridgeResponse>
}

/** Sends one NDJSON request per call over the app's local socket. */
export class SocketForwarder implements A2uiForwarder {
  constructor(
    private readonly socketPath: string,
    private readonly sessionKey: string,
    private readonly timeoutMs = 10_000
  ) {}

  forward(messages: unknown[]): Promise<BridgeResponse> {
    const request: BridgeRequest = { id: randomUUID(), sessionKey: this.sessionKey, messages }
    return new Promise((resolve) => {
      const fail = (error: string) => {
        socket.destroy()
        resolve({ id: request.id, ok: false, errors: [error] })
      }
      const socket = connect(this.socketPath)
      const splitter = new LineSplitter()
      socket.setEncoding('utf8')
      socket.setTimeout(this.timeoutMs, () => fail('timed out waiting for AgentXP'))
      socket.on('connect', () => socket.write(JSON.stringify(request) + '\n'))
      socket.on('data', (chunk: string) =>
        splitter.push(chunk, (line) => {
          try {
            const res = JSON.parse(line) as BridgeResponse
            socket.end()
            resolve(res)
          } catch {
            fail('invalid response from AgentXP')
          }
        })
      )
      socket.on('error', (e) => fail(`cannot reach AgentXP: ${e.message}`))
    })
  }
}
