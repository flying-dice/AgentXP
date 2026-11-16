import { defineConfig } from 'vitest/config'

// End-to-end specs drive the built Electron app (`out/`) through Playwright's `_electron`.
// One worker, one spec file at a time: every spec launches its own app with a private user-data dir.
export default defineConfig({
  test: {
    include: ['e2e/**/*.e2e.ts'],
    environment: 'node',
    testTimeout: 90_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    pool: 'forks',
    maxWorkers: 1,
    isolate: true
  }
})
