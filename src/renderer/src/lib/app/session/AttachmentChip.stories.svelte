<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import AttachmentChip from './AttachmentChip.svelte'

  const { Story } = defineMeta({
    title: 'App/Session/AttachmentChip',
    component: AttachmentChip,
    args: { path: 'C:\\Users\\jonathan\\notes\\login-bug.md', onremove: fn() },
    argTypes: { path: { control: 'text' }, onremove: { action: 'remove' } }
  })
</script>

<Story name="Default" />
<Story name="LongName" args={{ path: '/home/jonathan/a-very-long-file-name-that-needs-an-ellipsis-to-fit.tar.gz' }} />
