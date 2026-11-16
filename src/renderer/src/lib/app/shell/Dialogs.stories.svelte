<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AboutDialog from './AboutDialog.svelte'
  import FileViewDialog from './FileViewDialog.svelte'
  import RenameDialog from './RenameDialog.svelte'
  import ShortcutsDialog from './ShortcutsDialog.svelte'
  import { sampleNew } from '../../kit/organisms/stories.samples'

  const { Story } = defineMeta({
    title: 'App/Dialogs',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="About" asChild><AboutDialog version="0.1.0" /></Story>
<Story name="KeyboardShortcuts" asChild><ShortcutsDialog /></Story>
<Story name="RenameSession" asChild><RenameDialog value="Fix login redirect bug" /></Story>
<Story name="FileView" asChild><FileViewDialog path="src/auth/redirect.ts" text={sampleNew} /></Story>
<Story name="FileViewError" asChild><FileViewDialog path="src/big.bin" text="" error="The file is not a text file." /></Story>
