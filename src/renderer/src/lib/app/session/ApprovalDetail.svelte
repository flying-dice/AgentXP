<script lang="ts">
  /** What a permission request would do, for the approval dialogs: the change to a file, or the command. */
  import type { AguiToolCallState } from '@shared/agui-state'
  import Button from '../../kit/atoms/Button.svelte'
  import CodeViewer from '../../kit/organisms/CodeViewer.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import DiffViewer from '../../kit/organisms/DiffViewer.svelte'
  import { gateReasonOf } from '@shared/gateReason'
  import { changeSummary } from './changeSummary'
  import { canShowMore, diffViewportPx, growRoomPx, isLongChange, previewIsTight, wholeChangePx } from './diffViewport'
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
  /** The tallest the preview can get: what it has plus what the chat above it can give up (UX-194). */
  let room = $state(Infinity)
  /** The window has no room to grow: the link opens the whole change in a box over the chat instead (UX-194). */
  let whole = $state(false)

  function measure(node: HTMLElement): { destroy: () => void } {
    const transcript = (): HTMLElement | null => node.closest('.session-view')?.querySelector<HTMLElement>('[data-testid="chat-transcript"]') ?? null
    const read = (): void => {
      available = node.clientHeight
      const above = transcript()
      room = above ? growRoomPx(node.clientHeight, above.clientHeight) : Infinity
    }
    read()
    const observer = new ResizeObserver(read)
    observer.observe(node)
    const above = transcript()
    if (above) observer.observe(above)
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
  /** More of the change is out of view than the preview shows: the link offers it. A click always changes the screen (UX-194). */
  const clipped = $derived(!!summary && (expanded || tight || isLongChange(rows)))
  /** The click makes the preview taller when the window has room, else it opens the whole change in a box. */
  const grows = $derived(expanded || canShowMore(available, room, rows))
  function toggleMore(): void {
    if (grows) expanded = !expanded
    else whole = true
  }
</script>

{#if diff?.kind === 'diff' && summary}
  {#if whole}
    <Dialog title="Whole change" width="calc(100% - 16px)" height="calc(100% - 16px)" fill contained bodyColor="window" testid="{testid}-whole-change" onclose={() => (whole = false)}>
      <div class="whole">
        <div class="whole-path">{diff.path} <span class="summary">{summary.text}</span></div>
        <div class="whole-view" data-testid="{testid}-whole-change-view">
          <DiffViewer oldText={diff.oldText ?? ''} newText={diff.newText} fileName={diff.path} toolbar={false} wrap label="Whole change" />
        </div>
      </div>
      {#snippet buttons()}
        <Button isDefault data-testid="{testid}-whole-change-close" onclick={() => (whole = false)}>Close</Button>
      {/snippet}
    </Dialog>
  {/if}
  <div class="detail" data-testid="{testid}-detail">
    <div class="head">
      <span class="path" data-testid="{testid}-detail-path">{diff.path}</span>
      <span class="summary" data-testid="{testid}-detail-summary">{summary.text}</span>
      {#if clipped}
        <button type="button" class="more" data-testid="{testid}-detail-more" aria-expanded={grows ? expanded : undefined} aria-haspopup={grows ? undefined : 'dialog'} data-mode={grows ? 'grow' : 'dialog'} onclick={toggleMore}>{expanded ? 'Show fewer lines' : tight || !grows ? 'Show the whole change' : `Show all ${summary.rows} lines`}</button>
      {/if}
    </div>
    {#if summary.unreadable}
      <CodeViewer code={diff.newText} language="text" wordWrap maxHeight="140px" label="New text of the file" />
    {:else}
      <div class="view" style:height="{viewport}px" use:measure data-testid="{testid}-detail-view">
        <DiffViewer oldText={diff.oldText ?? ''} newText={diff.newText} fileName={diff.path} toolbar={false} wrap label="Change preview" />
      </div>
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
  /* The whole change in a box over the chat: the path on top, the diff at the full height of the box (UX-194). */
  .whole {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 6px 8px 0;
  }
  .whole-path {
    flex: none;
    font-weight: 600;
    overflow-wrap: anywhere;
    margin-bottom: 4px;
  }
  .whole-view {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .whole-view :global(.w7-diffviewer) {
    flex: 1 1 auto;
    min-height: 0;
  }
  /* On the line of the file and the size of the change, so the preview gets the height (UX-177). */
  .more {
    margin-left: auto;
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
