<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import MessageIcon from './MessageIcon.svelte'

  const kinds = ['information', 'warning', 'error', 'question', 'shield'] as const

  const { Story } = defineMeta({
    title: 'Molecules/MessageIcon',
    component: MessageIcon,
    args: { kind: 'information', size: 32 },
    argTypes: {
      kind: { control: 'select', options: kinds },
      size: { control: { type: 'number', min: 16, max: 96 } },
      title: { control: 'text' }
    }
  })
</script>

<Story name="Default" />

<Story name="AllKinds" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div class="row">
      {#each kinds as kind (kind)}
        <figure><MessageIcon {kind} /><figcaption>{kind}</figcaption></figure>
      {/each}
    </div>
  {/snippet}
</Story>

<Story name="Large" args={{ kind: 'shield', size: 64 }} />

<style>
  .row {
    display: flex;
    gap: 24px;
  }
  figure {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font-size: 11px;
  }
</style>
