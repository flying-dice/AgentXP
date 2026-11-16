<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import SpinButtons from './SpinButtons.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/SpinButtons',
    component: SpinButtons,
    args: { upDisabled: false, downDisabled: false },
    argTypes: {
      upDisabled: { control: 'boolean' },
      downDisabled: { control: 'boolean' },
      onup: { action: 'up' },
      ondown: { action: 'down' }
    }
  })
</script>

<Story name="Default">
  {#snippet template(args)}
    <div style="height: 21px; display: inline-flex"><SpinButtons {...args} /></div>
  {/snippet}
</Story>
