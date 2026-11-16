<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import TextBox from './TextBox.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/TextBox',
    component: TextBox,
    args: { value: 'Fix the login redirect', placeholder: '', multiline: false, password: false, readonly: false, disabled: false },
    argTypes: {
      value: { control: 'text' },
      placeholder: { control: 'text' },
      multiline: { control: 'boolean' },
      password: { control: 'boolean' },
      readonly: { control: 'boolean' },
      disabled: { control: 'boolean' },
      maxlength: { control: 'number' },
      onkeydown: { action: 'keydown' }
    }
  })
</script>

<Story name="Default" />

<Story name="Placeholder" args={{ value: '', placeholder: 'Type a message...' }} />

<Story name="Password" args={{ password: true, value: 'hunter2' }} />

<Story name="ReadOnly" args={{ readonly: true }} />

<Story name="Disabled" args={{ disabled: true }} />

<Story name="MaxLength" args={{ maxlength: 10, value: '', placeholder: 'max 10 chars' }} />

<Story
  name="Multiline"
  args={{
    multiline: true,
    value: 'Line one\nLine two\nLine three\nLine four\nLine five\nLine six\nLine seven'
  }}
>
  {#snippet template(args)}
    <TextBox {...args} style="width: 280px; height: 90px" />
  {/snippet}
</Story>
