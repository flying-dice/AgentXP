<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import ToolTip from './ToolTip.svelte'
  import Button from './Button.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/ToolTip',
    component: ToolTip,
    args: { text: 'Open an existing project folder (Ctrl+O)', delay: 500, disabled: false },
    argTypes: {
      text: { control: 'text' },
      delay: { control: { type: 'number', min: 0, max: 3000, step: 100 } },
      disabled: { control: 'boolean' }
    }
  })
</script>

<Story name="Default">
  {#snippet template(args)}
    <ToolTip {...args}>
      <Button icon="folder">Open folder</Button>
    </ToolTip>
  {/snippet}
</Story>

<Story name="InstantMultiline" args={{ delay: 0, text: 'Compact conversation\nSummarises earlier turns to free context.' }}>
  {#snippet template(args)}
    <ToolTip {...args}>
      <Button icon="compact">Compact</Button>
    </ToolTip>
  {/snippet}
</Story>

<Story name="RichContent" args={{ delay: 0 }}>
  {#snippet template(args)}
    <ToolTip {...args}>
      {#snippet trigger({ describedBy })}
        <Button icon="options" aria-describedby={describedBy}>Options</Button>
      {/snippet}
      {#snippet content()}
        <b>Options</b><br />Change application settings.
      {/snippet}
    </ToolTip>
  {/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
  {#snippet template(args)}
    <ToolTip {...args}><Button>No tip</Button></ToolTip>
  {/snippet}
</Story>
