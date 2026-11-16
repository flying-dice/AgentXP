<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import ErrorProvider from './ErrorProvider.svelte'
  import TextBox from './TextBox.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/ErrorProvider',
    component: ErrorProvider,
    args: { message: 'Session name cannot be empty.' },
    argTypes: { message: { control: 'text' } }
  })
</script>

<Story name="Default" />

<Story name="NextToTextBox" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div style="display: flex; align-items: center; gap: 4px">
      <TextBox value="" placeholder="Session name" />
      <ErrorProvider message="Session name cannot be empty." />
    </div>
  {/snippet}
</Story>

<Story name="NoError" args={{ message: '' }} />
