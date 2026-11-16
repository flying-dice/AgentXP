import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// The svelte plugin compiles `.svelte.ts` rune modules (e.g. the AG-UI session store) for tests.
export default defineConfig({
  plugins: [svelte()],
  resolve: { alias: { '@shared': resolve('src/shared') } },
  test: { include: ['src/main/**/*.test.ts', 'src/shared/**/*.test.ts', 'src/renderer/src/**/*.test.ts', 'agents/**/*.test.ts', 'scripts/ux-panel/**/*.test.mjs'], environment: 'node' }
})
