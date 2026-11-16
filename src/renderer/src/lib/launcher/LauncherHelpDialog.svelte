<script lang="ts">
  /** F1 in the launcher: the Desktop Connection manual in a Help and Support box (the launcher has no desktop to open Help in). */
  import DialogButtons from '../kit/molecules/DialogButtons.svelte'
  import Dialog from '../kit/organisms/Dialog.svelte'
  import MarkdownView from '../kit/organisms/MarkdownView.svelte'
  import { helpTopics } from '../apps/help/helpTopics'

  interface Props {
    onclose?: () => void
  }

  let { onclose }: Props = $props()

  const source = helpTopics.find((t) => t.id === 'launcher')?.body ?? 'The Desktop Connection manual is not available.'
</script>

<Dialog testid="launcher-help" title="Help and Support" iconName="help" width="470px" height="470px" fill contained {onclose}>
  <div class="article w7-scroll" data-testid="launcher-help-article">
    <MarkdownView {source} label="Desktop Connection manual" />
  </div>
  {#snippet buttons()}
    <DialogButtons buttons={[{ result: 'ok', label: 'Close' }]} cancelButton="ok" onresult={() => onclose?.()} />
  {/snippet}
</Dialog>

<style>
  .article {
    flex: 1;
    min-height: 0;
    overflow: auto;
    margin: 10px 14px 0;
    padding: 8px 12px;
    background: #fff;
    border: 1px solid var(--w7-list-border);
    user-select: text;
  }
</style>
