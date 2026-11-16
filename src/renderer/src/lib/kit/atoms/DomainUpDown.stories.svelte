<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import DomainUpDown from './DomainUpDown.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/DomainUpDown',
    component: DomainUpDown,
    args: {
      items: ['Ask before edits', 'Edit automatically', 'Plan mode', 'Bypass permissions'],
      value: 'Ask before edits',
      wrap: false,
      disabled: false
    },
    argTypes: {
      items: { control: 'object' },
      value: { control: 'text' },
      wrap: { control: 'boolean' },
      disabled: { control: 'boolean' },
      onchange: { action: 'change' }
    }
  })
</script>

<Story name="Default" args={{ style: 'width: 170px' }} />

<Story name="Wrap" args={{ wrap: true, items: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], value: 'Fri' }} />

<Story name="Disabled" args={{ disabled: true }} />
