<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Label from './Label.svelte'
  import TextBox from './TextBox.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/Label',
    component: Label,
    args: { text: 'Message to Claude:', disabled: false, autoEllipsis: false },
    argTypes: {
      text: { control: 'text' },
      for: { control: 'text' },
      disabled: { control: 'boolean' },
      autoEllipsis: { control: 'boolean' }
    }
  })
</script>

<Story name="Default" />

<Story name="Disabled" args={{ disabled: true }} />

<Story
  name="AutoEllipsis"
  args={{
    autoEllipsis: true,
    text: 'C:\\Users\\jonathan\\source\\claude-code-win\\src\\renderer\\components\\very\\long\\path.ts'
  }}
>
  {#snippet template(args)}
    <div style="width: 220px"><Label {...args} /></div>
  {/snippet}
</Story>

<Story name="ForTextBox" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div style="display: flex; gap: 6px; align-items: center">
      <Label for="name-box" text="Name:" />
      <TextBox id="name-box" value="Click the label to focus me" />
    </div>
  {/snippet}
</Story>
