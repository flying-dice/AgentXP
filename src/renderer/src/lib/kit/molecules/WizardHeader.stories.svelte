<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import WizardHeader from './WizardHeader.svelte'
  import { iconNames } from '../atoms/icons'

  const { Story } = defineMeta({
    title: 'Molecules/WizardHeader',
    component: WizardHeader,
    args: { title: 'Create a Basic Task', description: 'Use this wizard to quickly schedule a common task. For more options, use Create Task in the Actions pane.', icon: 'scheduler' },
    argTypes: {
      title: { control: 'text' },
      description: { control: 'text' },
      icon: { control: 'select', options: [undefined, ...iconNames] }
    }
  })
</script>

{#snippet framed(args: { title: string; description?: string; icon?: (typeof iconNames)[number] })}
  <div style="width:520px;border:1px solid var(--w7-group-border)"><WizardHeader {...args} /></div>
{/snippet}

<Story name="Default">
  {#snippet template(args)}{@render framed(args)}{/snippet}
</Story>

<Story name="ShortStep" args={{ title: 'Trigger', description: 'When do you want the task to start?' }}>
  {#snippet template(args)}{@render framed(args)}{/snippet}
</Story>

<Story name="WithoutIcon" args={{ icon: undefined }}>
  {#snippet template(args)}{@render framed(args)}{/snippet}
</Story>
