<script lang="ts">
  /** What a permission request would do, for the approval dialogs: the change to a file, or the command. */
  import type { AguiToolCallState } from '@shared/agui-state'
  import CodeViewer from '../../kit/organisms/CodeViewer.svelte'
  import DiffViewer from '../../kit/organisms/DiffViewer.svelte'
  import { gateReasonOf } from '@shared/gateReason'
  import { changeSummary } from './changeSummary'
  import { diffViewportPx, isLongChange, previewIsTight, wholeChangePx } from './diffViewport'
  import { toolArgument } from './toolSummary'

  interface Props {
    toolCall?: AguiToolCallState
    /** Test id prefix: `<prefix>-detail`, `<prefix>-detail-path`, `<prefix>-detail-summary`, `<prefix>-detail-more`. */
    testid: string
    /** Show the setting that made Agent7 ask ("Run commands is set to Ask in Control Center.") on its own line under the command. */
    note?: boolean
    /** The whole change is shown ("Show the whole change"); the box around it then takes more of the window. */
    expanded?: boolean
  }

  let { toolCall, testid, note = true, expanded = $bindable(false) }: Props = $props()

  /** The height the preview has right now; below 8 rows the box offers "Show the whole change" (UX-158). */
  let available = $state(Infinity)

  function measure(node: HTMLElement): { destroy: () => void } {
    const read = (): void => void (available = node.clientHeight)
    read()
    const observer = new ResizeObserver(read)
    observer.observe(node)
    return { destroy: () => observer.disconnect() }
  }

  const diff = $derived(toolCall?.contents.find((c) => c.kind === 'diff'))
  const summary = $derived(diff?.kind === 'diff' ? changeSummary(diff.oldText, diff.newText, { path: diff.path, error: diff.oldTextError }) : null)
  const argument = $derived(toolCall ? toolArgument(toolCall.kind, toolCall.rawInput, toolCall.locations, toolCall.title) : '')
  /** Why Agent7 asks, apart from the command (it is never part of the command text). */
  const setting = $derived(note ? gateReasonOf(toolCall?.rawInput) : null)
  const rows = $derived(summary?.rows ?? 0)
  const viewport = $derived(expanded ? wholeChangePx(rows) : diffViewportPx(rows))
  /** The box is too small for 8 rows of the preview. */
  const tight = $derived(!expanded && previewIsTight(available, rows))
  const clipped = $derived(!!summary && (tight || expanded || isLongChange(rows)))
</script>

{#if diff?.kind === 'diff' && summary}
  <div class="detail" data-testid="{testid}-detail">
    <div class="head">
      <span class="path" data-testid="{testid}-detail-path">{diff.path}</span>
      <span class="summary" data-testid="{testid}-detail-summary">{summary.text}</span>
    </div>
    {#if summary.unreadable}
      <CodeViewer code={diff.newText} language="text" wordWrap maxHeight="140px" label="New text of the file" />
    {:else}
      <div class="view" style:height="{viewport}px" use:measure data-testid="{testid}-detail-view">
        <DiffViewer oldText={diff.oldText ?? ''} newText={diff.newText} fileName={diff.path} toolbar={false} wrap label="Change preview" />
      </div>
    {/if}
    {#if clipped}
      <button type="button" class="more" data-testid="{testid}-detail-more" aria-expanded={expanded} onclick={() => (expanded = !expanded)}>{expanded ? 'Show fewer lines' : tight ? 'Show the whole change' : `Show all ${summary.rows} lines`}</button>
    {/if}
  </div>
{:else if argument}
  <div class="detail" data-testid="{testid}-detail">
    <CodeViewer code={argument} language={toolCall?.kind === 'execute' ? 'bash' : 'text'} wordWrap maxHeight="140px" label="Details" />
    {#if setting}<div class="setting" data-testid="{testid}-detail-setting">{setting}</div>{/if}
  </div>
{/if}

<style>
  .detail {
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  /* The preview keeps its height unless the box is too small; then it shrinks and scrolls alone (one scroll area). */
  .view {
    flex: 0 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .view :global(.w7-diffviewer) {
    flex: 1 1 auto;
    min-height: 0;
  }
  /* The file and the size of the change share a line, so the preview gets the height (UX-158). */
  .head {
    display: flex;
    flex-wrap: wrap;
    gap: 0 8px;
    margin-bottom: 4px;
  }
  .path {
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .summary {
    color: var(--w7-text-muted);
  }
  .setting {
    margin-top: 3px;
    font-size: 11px;
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
