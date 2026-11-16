<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import StatusStripLabel from './StatusStripLabel.svelte'

  const { Story } = defineMeta({
    title: 'Molecules/StatusStripLabel',
    component: StatusStripLabel,
    args: { text: 'Ready', spring: false, borders: [] },
    argTypes: {
      spring: { control: 'boolean' },
      borders: { control: 'check', options: ['left', 'right'] },
      textAlign: { control: 'inline-radio', options: ['left', 'right', 'center'] }
    }
  })
</script>

<Story name="Default">
  {#snippet template(args)}
    <div class="strip"><StatusStripLabel {...args} /></div>
  {/snippet}
</Story>

<Story name="Spring" args={{ spring: true }}>
  {#snippet template(args)}
    <div class="strip"><StatusStripLabel {...args} /></div>
  {/snippet}
</Story>

<Story name="Borders" args={{ text: 'Branch: main', borders: ['left'] }}>
  {#snippet template(args)}
    <div class="strip"><StatusStripLabel {...args} /></div>
  {/snippet}
</Story>

<Story name="Composition" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div class="strip">
      <StatusStripLabel text="Ready" spring />
      <StatusStripLabel text="Branch: main" borders={['left']} />
      <StatusStripLabel text="Claude Sonnet 5.5" borders={['left']} />
      <StatusStripLabel text="Connected" icon="globe" borders={['left']} />
    </div>
  {/snippet}
</Story>

<style>
  .strip {
    display: flex;
    align-items: center;
    width: 480px;
    height: 24px;
    background: linear-gradient(#f5f7fa, #dbe4f1);
    border-top: 1px solid #a9b6c9;
  }
</style>
