// `npm run test:e2e`: selector rule check, build, then the Playwright specs under vitest.
// Linux without a display (CI, containers) runs inside `xvfb-run -a`; macOS and Windows have a display, so
// the specs run directly. Pass vitest arguments after `--` (e.g. `npm run test:e2e -- e2e/launcher.e2e.ts`).
// Set A7_E2E_SKIP_BUILD=1 to reuse an existing `out/` build.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const vitest = join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs')
const run = (command, args, env = process.env) => {
  const result = spawnSync(command, args, { stdio: 'inherit', env, shell: process.platform === 'win32' && command === 'npx' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run(process.execPath, ['scripts/check-e2e-selectors.mjs'])
if (!process.env.A7_E2E_SKIP_BUILD) run('npx', ['electron-vite', 'build'])

// Plain Node, not ELECTRON_RUN_AS_NODE: the specs launch Electron themselves and must not pass that flag on.
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
const specs = [vitest, 'run', '-c', 'vitest.e2e.config.ts', ...process.argv.slice(2)]
const headless = process.platform === 'linux' && !process.env.DISPLAY
if (headless) run('xvfb-run', ['-a', '--server-args=-screen 0 1600x1000x24', process.execPath, ...specs], env)
else run(process.execPath, specs, env)
