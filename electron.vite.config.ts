import { cpSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// The version users see comes from package.json at build time: `app.getVersion()` reports Electron's own version
// when the app runs unpackaged from `out/`.
const version = (JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { version: string }).version

const shared = { '@shared': resolve('src/shared') }

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin(),
      {
        // The scripted agent finds its sample scripts in `scripts/` next to its entry file.
        name: 'copy-scripted-agent-scripts',
        writeBundle() {
          cpSync(resolve('agents/scripted-agent/scripts'), resolve('out/main/scripts'), { recursive: true })
        }
      }
    ],
    resolve: { alias: shared },
    define: { __APP_VERSION__: JSON.stringify(version) },
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts'),
          // Stdio MCP server the harness hands to agents so they can draw A2UI surfaces.
          'a2ui-mcp': resolve('src/main/infrastructure/a2ui/mcp-server.ts'),
          // Scripted ACP agent for end-to-end tests (agents/scripted-agent/README.md).
          'scripted-agent': resolve('agents/scripted-agent/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: shared }
  },
  renderer: {
    resolve: {
      alias: { ...shared, $lib: resolve('src/renderer/src/lib') }
    },
    plugins: [svelte()]
  }
})
