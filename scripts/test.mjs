// Runs vitest under Electron's Node so native modules (better-sqlite3) match the ABI they were
// rebuilt for by `electron-builder install-app-deps` (the `postinstall` step).
// If better-sqlite3 cannot be loaded there (e.g. it was rebuilt for plain Node because Electron's
// headers were unreachable), falls back to the current Node and says so.
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const electronBinary = require('electron')
const vitest = join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs')
const asNode = { ...process.env, ELECTRON_RUN_AS_NODE: '1' }

const loadsUnderElectron = () =>
  spawnSync(electronBinary, ['-e', "new (require('better-sqlite3'))(':memory:').close()"], { env: asNode, stdio: 'ignore' })
    .status === 0

const underElectron = loadsUnderElectron()
if (!underElectron) {
  console.warn('[test] better-sqlite3 does not load under Electron; running vitest on plain Node instead.')
}

const child = spawn(underElectron ? electronBinary : process.execPath, [vitest, 'run', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: underElectron ? asNode : process.env
})
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
