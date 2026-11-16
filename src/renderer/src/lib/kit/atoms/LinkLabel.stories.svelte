<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import LinkLabel from './LinkLabel.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/LinkLabel',
    component: LinkLabel,
    args: { text: 'View the changelog', visited: false, disabled: false },
    argTypes: {
      text: { control: 'text' },
      visited: { control: 'boolean' },
      disabled: { control: 'boolean' },
      onclick: { action: 'click' }
    }
  })
</script>

<Story name="Default" />

<Story name="Visited" args={{ visited: true }} />

<Story name="Disabled" args={{ disabled: true }} />

<Story name="InSentence" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <span>Need help? <LinkLabel text="Open the documentation" /> or <LinkLabel text="report a bug" />.</span>
  {/snippet}
</Story>
