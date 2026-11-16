import type { StorybookConfig } from '@storybook/svelte-vite'
import { resolve } from 'node:path'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

const config: StorybookConfig = {
  stories: ['../src/renderer/src/**/*.stories.@(ts|svelte)', '../src/renderer/src/**/*.mdx'],
  addons: ['@storybook/addon-svelte-csf', '@storybook/addon-docs'],
  framework: { name: '@storybook/svelte-vite', options: {} },
  async viteFinal(config) {
    config.plugins = [...(config.plugins ?? []), svelte(), tailwindcss()]
    config.resolve = {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias ?? {}),
        $lib: resolve(__dirname, '../src/renderer/src/lib'),
        '@shared': resolve(__dirname, '../src/shared')
      }
    }
    return config
  }
}

export default config
