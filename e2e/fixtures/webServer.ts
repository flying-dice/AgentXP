/**
 * A tiny local http server for fixture web apps (`e2e/fixtures/web/*`), so the Browser app has a real page to drive
 * without the internet. It serves only files of that folder, on 127.0.0.1 with a free port.
 */
import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), 'web')

const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' }

export interface WebServer {
  /** `http://127.0.0.1:<port>` without a trailing slash. */
  readonly origin: string
  close(): Promise<void>
}

export async function serveFixtureWeb(): Promise<WebServer> {
  const server: Server = createServer((request, response) => {
    void (async () => {
      const path = normalize(decodeURIComponent((request.url ?? '/').split('?')[0])).replace(/^([/\\])+/, '')
      if (path.includes('..')) return void response.writeHead(403).end()
      try {
        const file = await readFile(join(root, path || 'chat-app.html'))
        const extension = path.slice(path.lastIndexOf('.'))
        response.writeHead(200, { 'content-type': TYPES[extension] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(file)
      } catch {
        response.writeHead(404).end('not found')
      }
    })()
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  }
}
