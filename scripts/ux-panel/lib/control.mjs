// Minimal client of the scripted agent's control socket (agents/scripted-agent/README.md, "Control socket protocol").
import net from 'node:net'

export async function connectControl(socketPath, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      return await open(socketPath)
    } catch (error) {
      if (Date.now() > deadline) throw error
      await new Promise((r) => setTimeout(r, 100))
    }
  }
}

function open(socketPath) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(socketPath)
    let buffer = ''
    let nextId = 1
    const waiting = new Map()
    const events = []
    socket.on('data', (chunk) => {
      buffer += chunk
      for (let i = buffer.indexOf('\n'); i >= 0; i = buffer.indexOf('\n')) {
        const message = JSON.parse(buffer.slice(0, i))
        buffer = buffer.slice(i + 1)
        if (message.event) events.push(message)
        else if (message.id !== undefined && waiting.has(message.id)) {
          waiting.get(message.id)(message)
          waiting.delete(message.id)
        }
      }
    })
    socket.on('error', reject)
    socket.on('connect', () => {
      const send = (cmd, extra = {}) =>
        new Promise((res) => {
          const id = nextId++
          waiting.set(id, res)
          socket.write(`${JSON.stringify({ cmd, id, ...extra })}\n`)
        })
      const client = {
        events,
        status: () => send('status'),
        next: async () => (await send('next')).released === true,
        setMode: (mode) => send(mode),
        async waitForState(state, ms = 20_000) {
          const deadline = Date.now() + ms
          for (;;) {
            const s = await send('status')
            if (s.state === state) return s
            if (Date.now() > deadline) throw new Error(`scripted agent did not reach state ${state} (is ${s.state})`)
            await new Promise((r) => setTimeout(r, 50))
          }
        },
        waitForPause: (ms) => client.waitForState('paused', ms),
        close: () => socket.destroy()
      }
      resolve(client)
    })
  })
}
