// Runs vitest under Electron's Node (ELECTRON_RUN_AS_NODE=1) so tests exercise the same runtime
// (and the same built-in `node:sqlite`) as production. Falls back to plain Node only if the
// electron binary is not installed.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const vitest = join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs')

let electronBinary
try {
  const resolved = require('electron')
  if (typeof resolved === 'string' && existsSync(resolved)) electronBinary = resolved
} catch {
  // electron package missing or its binary was not downloaded
}
if (!electronBinary) console.warn('[test] electron binary not found; running vitest on plain Node instead.')

// node:sqlite prints an ExperimentalWarning on some Node versions; keep test output clean.
const env = { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, '--no-warnings'].filter(Boolean).join(' ') }
if (electronBinary) env.ELECTRON_RUN_AS_NODE = '1'

const child = spawn(electronBinary ?? process.execPath, [vitest, 'run', ...process.argv.slice(2)], { stdio: 'inherit', env })
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
