<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import type { ComponentProps } from 'svelte'
  import { fn } from 'storybook/test'
  import Composer from './Composer.svelte'
  import { modes } from './session.fixtures'

  const { Story } = defineMeta({
    title: 'App/Session/Composer',
    component: Composer,
    args: {
      agentName: 'Claude Code',
      running: false,
      modes,
      modeId: 'default',
      openFilePath: 'C:\\Users\\jonathan\\source\\claude-code-win\\src\\auth\\redirect.ts',
      onsend: fn(),
      oncancel: fn(),
      onmode: fn(),
      pickFiles: async () => ['C:\\Users\\jonathan\\notes\\login-bug.md', 'C:\\Users\\jonathan\\Pictures\\screenshot.png']
    },
    argTypes: {
      agentName: { control: 'text' },
      running: { control: 'boolean' },
      modeId: { control: 'text' },
      openFilePath: { control: 'text' },
      onsend: { action: 'send' },
      oncancel: { action: 'cancel' },
      onmode: { action: 'mode' }
    }
  })
</script>

{#snippet frame(args: ComponentProps<typeof Composer>)}
  <div style="width:600px"><Composer {...args} /></div>
{/snippet}

<Story name="Default">{#snippet template(args)}{@render frame(args)}{/snippet}</Story>
<Story name="Running" args={{ running: true }}>{#snippet template(args)}{@render frame(args)}{/snippet}</Story>
<Story name="NoModesNoOpenFile" args={{ modes: [], openFilePath: null }}>{#snippet template(args)}{@render frame(args)}{/snippet}</Story>
