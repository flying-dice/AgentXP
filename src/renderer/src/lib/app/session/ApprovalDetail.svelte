<script lang="ts">
  /** What a permission request would do, for the approval dialogs: the change to a file, or the command. */
  import type { AguiToolCallState } from '@shared/agui-state'
  import CodeViewer from '../../kit/organisms/CodeViewer.svelte'
  import DiffViewer from '../../kit/organisms/DiffViewer.svelte'
  import { changeSummary } from './changeSummary'
  import { toolArgument } from './toolSummary'

  interface Props {
    toolCall?: AguiToolCallState
    /** Test id prefix: `<prefix>-detail`, `<prefix>-detail-path`, `<prefix>-detail-summary`, `<prefix>-detail-more`. */
    testid: string
  }

  let { toolCall, testid }: Props = $props()

  /** Rows shown before "Show all N lines" appears. */
  const CLIP_ROWS = 10

  let all = $state(false)

  const diff = $derived(toolCall?.contents.find((c) => c.kind === 'diff'))
  const summary = $derived(diff?.kind === 'diff' ? changeSummary(diff.oldText, diff.newText, { path: diff.path, error: diff.oldTextError }) : null)
  const argument = $derived(toolCall ? toolArgument(toolCall.kind, toolCall.rawInput, toolCall.locations, toolCall.title) : '')
  const clipped = $derived(!!summary && summary.rows > CLIP_ROWS)
</script>

{#if diff?.kind === 'diff' && summary}
  <div class="detail" data-testid="{testid}-detail">
    <div class="path" data-testid="{testid}-detail-path">{diff.path}</div>
    <div class="summary" data-testid="{testid}-detail-summary">{summary.text}</div>
    {#if summary.unreadable}
      <CodeViewer code={diff.newText} language="text" wordWrap maxHeight="140px" label="New text of the file" />
    {:else}
      <DiffViewer oldText={diff.oldText ?? ''} newText={diff.newText} fileName={diff.path} toolbar={false} wrap maxHeight={all ? '360px' : '170px'} label="Change preview" />
    {/if}
    {#if clipped}
      <button type="button" class="more" data-testid="{testid}-detail-more" aria-expanded={all} onclick={() => (all = !all)}>{all ? 'Show fewer lines' : `Show all ${summary.rows} lines`}</button>
    {/if}
  </div>
{:else if argument}
  <div class="detail" data-testid="{testid}-detail">
    <CodeViewer code={argument} language={toolCall?.kind === 'execute' ? 'bash' : 'text'} wordWrap maxHeight="140px" label="Details" />
  </div>
{/if}

<style>
  .detail {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .path {
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .summary {
    margin: 2px 0 6px;
    color: var(--w7-text-muted);
  }
  .more {
    align-self: flex-start;
    margin-top: 4px;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: var(--w7-link);
    cursor: default;
  }
  .more:hover {
    text-decoration: underline;
  }
  .more:focus-visible {
    outline: var(--w7-focus-outline);
  }
</style>
