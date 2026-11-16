// Newline-delimited JSON over a Unix socket: one request, one reply.
import net from 'node:net'

export function request(socketPath, payload, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(socketPath)
    let buffer = ''
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error('the session did not answer in time'))
    }, timeoutMs)
    socket.on('connect', () => socket.write(`${JSON.stringify(payload)}\n`))
    socket.on('data', (chunk) => {
      buffer += chunk
      const i = buffer.indexOf('\n')
      if (i >= 0) {
        clearTimeout(timer)
        socket.end()
        try {
          resolve(JSON.parse(buffer.slice(0, i)))
        } catch (e) {
          reject(e)
        }
      }
    })
    socket.on('error', (e) => {
      clearTimeout(timer)
      reject(e.code === 'ENOENT' || e.code === 'ECONNREFUSED' ? new Error('no running session (is UX_SESSION set to the session folder?)') : e)
    })
  })
}

export function serve(socketPath, handler) {
  const server = net.createServer((socket) => {
    let buffer = ''
    socket.on('data', async (chunk) => {
      buffer += chunk
      const i = buffer.indexOf('\n')
      if (i < 0) return
      const line = buffer.slice(0, i)
      buffer = buffer.slice(i + 1)
      let reply
      try {
        reply = await handler(JSON.parse(line))
      } catch (e) {
        reply = { ok: false, text: `error: ${e instanceof Error ? e.message : String(e)}` }
      }
      socket.end(`${JSON.stringify(reply)}\n`)
    })
    socket.on('error', () => {})
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(socketPath, () => resolve(server))
  })
}
