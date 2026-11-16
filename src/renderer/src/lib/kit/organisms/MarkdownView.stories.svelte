<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import MarkdownView from './MarkdownView.svelte'
  import { sampleMarkdown } from './stories.samples'

  const { Story } = defineMeta({
    title: 'Organisms/MarkdownView',
    component: MarkdownView,
    args: { source: sampleMarkdown },
    argTypes: { source: { control: 'text' }, onlink: { action: 'link' } }
  })
</script>

<Story name="Default">
  {#snippet template(args)}
    <div class="doc"><MarkdownView {...args} /></div>
  {/snippet}
</Story>

<Story name="SanitisesHtml" args={{ source: 'Safe text <img src=x onerror="alert(1)"> <script>alert(2)<\/script> [js](javascript:alert(3))\n\n**bold** still works.' }}>
  {#snippet template(args)}
    <div class="doc"><MarkdownView {...args} /></div>
  {/snippet}
</Story>

<style>
  .doc {
    width: 560px;
    padding: 10px 14px;
    background: #fff;
    border: 1px solid var(--w7-list-border);
  }
</style>
