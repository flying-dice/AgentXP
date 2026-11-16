import type { Preview } from '@storybook/svelte-vite'
import '../src/renderer/src/app.css'

const preview: Preview = {
  parameters: {
    backgrounds: {
      options: {
        face: { name: 'Control face', value: '#f0f0f0' },
        window: { name: 'Window', value: '#ffffff' },
        desktop: { name: 'Desktop', value: '#1e5aa8' }
      }
    },
    controls: { expanded: true }
  },
  initialGlobals: { backgrounds: { value: 'face' } },
  tags: ['autodocs']
}

export default preview
