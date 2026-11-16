<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import RichTextBox from './RichTextBox.svelte'
  import { sampleMarkdown } from './stories.samples'

  const { Story } = defineMeta({
    title: 'Organisms/RichTextBox',
    component: RichTextBox,
    args: { value: sampleMarkdown, readOnly: true, markdown: true, disabled: false, height: '280px', placeholder: '' },
    argTypes: {
      value: { control: 'text' },
      readOnly: { control: 'boolean' },
      markdown: { control: 'boolean' },
      disabled: { control: 'boolean' },
      height: { control: 'text' },
      placeholder: { control: 'text' },
      onchange: { action: 'change' },
      onlink: { action: 'link' }
    }
  })
</script>

<Story name="ReadOnlyMarkdown">
  {#snippet template(args)}
    <div style="width:520px"><RichTextBox {...args} /></div>
  {/snippet}
</Story>

<Story name="EditablePlainText" args={{ readOnly: false, value: 'Fix the login redirect so deep links survive sign-in', height: '90px' }}>
  {#snippet template(args)}
    <div style="width:420px"><RichTextBox {...args} /></div>
  {/snippet}
</Story>

<Story name="EditablePlaceholder" args={{ readOnly: false, value: '', placeholder: 'Type a message...', height: '70px' }}>
  {#snippet template(args)}
    <div style="width:420px"><RichTextBox {...args} /></div>
  {/snippet}
</Story>

<Story name="Disabled" args={{ readOnly: false, disabled: true, value: 'Disabled text', height: '60px' }}>
  {#snippet template(args)}
    <div style="width:320px"><RichTextBox {...args} /></div>
  {/snippet}
</Story>
