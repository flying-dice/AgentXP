import type { StorybookConfig } from '@storybook/svelte-vite'
import { fileURLToPath } from 'node:url'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

const config: StorybookConfig = {
  stories: ['../src/renderer/src/**/*.stories.@(ts|svelte)', '../src/renderer/src/**/*.mdx'],
  addons: ['@storybook/addon-svelte-csf', '@storybook/addon-docs'],
  framework: { name: '@storybook/svelte-vite', options: {} },
  async viteFinal(config) {
    config.plugins = [svelte(), ...(config.plugins ?? []), tailwindcss()]
    config.resolve = {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias ?? {}),
        $lib: fileURLToPath(new URL('../src/renderer/src/lib', import.meta.url)),
        '@shared': fileURLToPath(new URL('../src/shared', import.meta.url))
      }
    }
    return config
  }
}

export default config
