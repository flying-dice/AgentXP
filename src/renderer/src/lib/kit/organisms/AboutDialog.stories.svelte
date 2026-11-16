<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AboutDialog from './AboutDialog.svelte'

  const { Story } = defineMeta({
    title: 'Organisms/AboutDialog',
    component: AboutDialog,
    argTypes: { name: { control: 'text' }, description: { control: 'text' }, version: { control: 'text' } }
  })
</script>

<Story name="Default" args={{ testid: 'notepad-about', name: 'Notepad', icon: 'file-text', description: 'Read and edit plain text files.', version: '0.1.0', onclose: () => {} }} />
