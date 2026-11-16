<script lang="ts">
  /**
   * The Changes pane: the files an agent changed, with a preview of the selected change and Revert. It is the one
   * place to review changes: the chat window and the Code window show this same pane (UX-40).
   * The list shows the whole file name beside its counts (UX-111, UX-116). It takes only the height of its rows (two at least, 35% of the
   * pane at most) so the diff has the rest, about 12 lines (UX-184); a bar between them remembers where the user put it. Reverted files
   * stay in the list (UX-117); selecting one says where the change is and offers "Restore", which puts the file back in one click (UX-185, UX-209). Status, File and Path are columns of their own, sized to their words (UX-207). The notice about them is one
   * line above the list, so it never takes height from the list.
   */
  import type { FileChangeDto, Id } from '@shared/models'
  import Button from '../../kit/atoms/Button.svelte'
  import DiffViewer from '../../kit/organisms/DiffViewer.svelte'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListRow } from '../../kit/organisms/ListView'
  import SplitContainer from '../../kit/organisms/SplitContainer.svelte'
import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import { ContextMenu } from '../../apps/shared/ContextMenu.svelte'
  import { changeRowItems } from '../changes/changeMenu'
  import { CHANGES_EMPTY, OPEN_BIN_LABEL, OPEN_GIT_LINK, RESTORE_LABEL, UNDONE_TEXT, gitNote, restoreFailedText, restoredText, revertReasonText } from '../changes/changesText'
  import type { RestoreOutcome } from '../changes/openRecycleBin'
  import { localStore } from '../../desktop/chatPane'
  import { REVERTED_ICON, REVERTED_KIND, REVERTED_LABEL, REVERTED_NOTE, changeKindIcon, changeKindLabel, changesSummary, fileChangeCounts, linesLabel, splitChangePath, splitForMiddleEllipsis } from '../changes/changeFormat'
  import { BESIDE_MAX_HEIGHT, changeColumns, isCompactList, BESIDE_LIST_WIDTH, BESIDE_MIN_WIDTH, DIFF_MIN_HEIGHT, DIFF_MIN_WIDTH, DIFF_WANTED_HEIGHT, LIST_MIN_HEIGHT, LIST_MIN_WIDTH, MIN_ROWS, SPLITTER, defaultListHeight, listHeightFor, readListSize, writeListSize, type RevertedChange } from '../changes/changesLayout'

  interface Props {
    changes: FileChangeDto[]
    /** Id of the selected change. */
    selectedId?: number | null
    /** Files that were reverted: they stay in the list, grey, with the link to the Recycle Bin (the caller keeps them, see `useRevertedChanges`). */
    reverted?: RevertedChange[]
    /** Names the window, so each window remembers its own list height. */
    layoutKey?: string
    /** Asks the user and reverts (the caller owns the question and the write). Resolves when it is done or declined. */
    onrevert?: (change: FileChangeDto) => void | Promise<void>
    onopeneditor?: (change: FileChangeDto) => void
    /** The link above the list and the "Restore..." button of a reverted row (with that row's Recycle Bin entry); without it they are not shown. */
    onopenrecyclebin?: (entryId?: Id) => void
    /** "Restore" of a reverted row: puts the file back in one click. Without it the button opens the Recycle Bin instead (UX-209). */
    onrestore?: (entryId: Id) => Promise<RestoreOutcome>
    /** How many files Git lists as changed. When the agent changed nothing but this is more than 0, the pane says so (UX-152). */
    gitCount?: number
    /** Whether the folder is under Git; false adds the line "This folder is not tracked by Git". Undefined: not known, no line. */
    gitTracked?: boolean
    /** The link beside that sentence; without it the link is not shown. */
    onopengit?: () => void
  }

  let { changes, selectedId = $bindable(null), reverted = [], layoutKey = 'default', onrevert, onopeneditor, onopenrecyclebin, onrestore, gitCount = 0, gitTracked, onopengit }: Props = $props()
  const uid = $props.id()
  const reasonId = `${uid}-reason`

  let listBoxWidth = $state(0)
  // A list too narrow for the Status column shows the status as the picture of each row instead (UX-207).
  const compact = $derived(isCompactList(listBoxWidth))
  const rows = $derived<ListRow[]>([
    ...changes.map((c) => ({
      id: String(c.id),
      testid: 'changes-item',
      icon: compact ? changeKindIcon(c.kind) : ('file-code' as const),
      file: c.path,
      dir: splitChangePath(c.path).dir,
      kind: changeKindLabel(c.kind),
      // A number, so that sorting by this column sorts by size.
      lines: fileChangeCounts(c).additions + fileChangeCounts(c).deletions,
      label: linesLabel(c),
      reverted: false
    })),
    ...reverted.map((c) => ({
      id: `reverted-${c.id}`,
      testid: 'changes-reverted',
      icon: compact ? REVERTED_ICON : ('file-code' as const),
      file: c.path,
      dir: splitChangePath(c.path).dir,
      kind: REVERTED_KIND,
      lines: -1,
      label: '',
      reverted: true
    }))
  ])
  const selected = $derived(changes.find((c) => c.id === selectedId) ?? null)
  // A reverted row can be selected too: the pane then says where the change is (UX-185). The pick is the Recycle Bin entry's id.
  let revertedPick = $state<number | null>(null)
  const pickedReverted = $derived(selected ? null : (reverted.find((c) => c.id === revertedPick) ?? null))

  // The list opens with the height of its rows; the diff has the rest. A height the user chose for this window wins.
  // svelte-ignore state_referenced_locally
  const chosenHeight = readListSize(localStore(), layoutKey)
  let splitHeight = $state(0)
  let listHeight = $state(chosenHeight ?? 0)
  let autoHeight = 0
  let autoRows = 0
  $effect(() => {
    if (chosenHeight !== null || splitHeight <= 0) return
    // Only the room and the number of rows move it; the user's drag (a value other than the automatic one) is kept after that.
    const next = defaultListHeight(rows.length, splitHeight)
    // It grows with the room and with the rows, and shrinks only when rows go: a notice above the list takes height from the diff, not from the list.
    if (listHeight === 0 || (listHeight === autoHeight && (next > listHeight || rows.length < autoRows))) listHeight = autoHeight = next
    autoRows = rows.length
  })

  // A wide, short pane (the Code window's dock) puts the diff beside the list instead of under it, so the diff keeps its height.
  let paneWidth = $state(0)
  let paneHeight = $state(0)
  const beside = $derived(paneWidth >= BESIDE_MIN_WIDTH && paneHeight < BESIDE_MAX_HEIGHT)
  // svelte-ignore state_referenced_locally
  let listWidth = $state(readListSize(localStore(), `${layoutKey}-beside`) ?? BESIDE_LIST_WIDTH)

  // File takes the free width, Status is as wide as its words, Path shows in a wide pane (UX-207).
  const columns = $derived(changeColumns(rows.map((r) => String(r.kind)), listBoxWidth))

  // "Restore" puts the file back in one click and says so; when that cannot be done it says why and offers the Recycle Bin (UX-209).
  let restoring = $state(false)
  let restored = $state<string | null>(null)
  let restoreFailed = $state<{ id: Id; text: string } | null>(null)
  const failedHere = $derived(pickedReverted !== null && restoreFailed?.id === pickedReverted.id ? restoreFailed : null)
  async function restore(entry: RevertedChange): Promise<void> {
    if (!onrestore) return onopenrecyclebin?.(entry.id)
    restoring = true
    try {
      const outcome = await onrestore(entry.id)
      if (outcome.restored) {
        restoreFailed = null
        restored = restoredText(entry.path)
      } else {
        restored = null
        restoreFailed = { id: entry.id, text: restoreFailedText(outcome.message) }
      }
    } finally {
      restoring = false
    }
  }

  // Why a button is grey, in words (the tooltip and the line beside the buttons).
  const revertReason = $derived(pickedReverted ? null : revertReasonText(changes.length > 0, selected !== null))
  const editorReason = $derived(pickedReverted ? null : !selected ? 'Select a changed file first.' : selected.kind === 'deleted' ? 'A deleted file cannot be opened.' : null)
  // The agent changed none: say so, then what Git knows or why there is nothing more (UX-152, UX-187).
  const nothingChanged = $derived(changes.length === 0 && reverted.length === 0)
  const note = $derived(nothingChanged ? gitNote(gitCount, gitTracked) : null)
  const reason = $derived(revertReason ?? editorReason)

  // The right-click menu of a row: Revert on a changed row, "Restore from the Recycle Bin" on a reverted one (UX-169).
  const menu = new ContextMenu()
  const rowItems = (id: string) =>
    changeRowItems({
      change: id.startsWith('reverted-') ? null : (changes.find((c) => String(c.id) === id) ?? null),
      onrevert,
      onopeneditor,
      onopenrecyclebin: onopenrecyclebin ? () => onopenrecyclebin(id.startsWith('reverted-') ? Number(id.slice('reverted-'.length)) : undefined) : undefined
    })

  async function revert(): Promise<void> {
    if (selected) await onrevert?.(selected)
  }
</script>

{#snippet listPanel()}
  <div class="list" bind:clientWidth={listBoxWidth}>
    <ListView
      {columns}
      {rows}
      testid="changes-list"
      selected={selected ? [String(selected.id)] : pickedReverted ? [`reverted-${pickedReverted.id}`] : []}
      emptyText={CHANGES_EMPTY}
      aria-label="Changed files"
      oncontextmenu={(row, event) => menu.show(event, rowItems(row.id))}
      onselect={(ids) => {
        const picked = ids[0]?.startsWith('reverted-') ?? false
        revertedPick = picked ? Number(ids[0].slice('reverted-'.length)) : null
        selectedId = ids[0] && !picked ? Number(ids[0]) : null
        restored = null
      }}
    >
      {#snippet cell(row, col)}
        {#if col.key === 'file'}
          {@const name = splitForMiddleEllipsis(splitChangePath(String(row.file)).name)}
          <span class="file" class:reverted={row.reverted} title={row.reverted ? `${row.file}. ${REVERTED_LABEL}` : `${row.file} (${String(row.kind).toLowerCase()})`} data-testid="changes-file">
            <b class="name"><span class="head" data-testid="changes-name-head">{name.head}</span><span class="tail" data-testid="changes-name-tail">{name.tail}</span></b>
          </span>
        {:else if col.key === 'kind'}
          {#if row.reverted}
            <span class="kind reverted" data-testid="changes-reverted-text" title={REVERTED_LABEL}>{row.kind}</span>
          {:else}
            <span class="kind" data-testid="changes-status" data-status={String(row.kind).toLowerCase()}>{row.kind}</span>
          {/if}
        {:else if col.key === 'dir'}
          <span class="dir" class:reverted={row.reverted} title={String(row.file)} data-testid="changes-path">{row.dir}</span>
        {:else}
          <span class="t" class:reverted={row.reverted} data-testid="changes-lines">{row.label}</span>
        {/if}
      {/snippet}
    </ListView>
  </div>
{/snippet}

{#snippet diffPanel()}
  <div class="diff" data-testid="changes-diff">
    {#if selected}
      {#key selected.id}
        <DiffViewer oldText={selected.originalText ?? ''} newText={selected.currentText ?? ''} fileName={selected.path} toolbar={false} wrap label="Diff of {selected.path}" />
      {/key}
    {:else if pickedReverted}
      <div class="hint undone" data-testid="changes-undone">
        <span data-testid="changes-undone-text">{failedHere ? failedHere.text : UNDONE_TEXT}</span>
        {#if onrestore && !failedHere}
          <Button data-testid="changes-restore" disabled={restoring} onclick={() => void restore(pickedReverted)}>{RESTORE_LABEL}</Button>
        {:else if onopenrecyclebin}
          <Button data-testid="changes-restore" data-mode="open-bin" onclick={() => onopenrecyclebin?.(pickedReverted.id)}>{OPEN_BIN_LABEL}</Button>
        {/if}
      </div>
    {:else}
      <div class="hint">Select a changed file to view its diff.</div>
    {/if}
  </div>
{/snippet}

<div class="changes" data-testid="changes-pane" role="presentation" onkeydown={(e) => menu.key(e, () => rowItems(selected ? String(selected.id) : (reverted[0] ? `reverted-${reverted[0].id}` : '')))} bind:clientWidth={paneWidth} bind:clientHeight={paneHeight}>
  {#if note?.kind === 'files'}
    <div class="note" data-testid="changes-git-note">
      {note.text}
      {#if onopengit}<button type="button" class="link" data-testid="changes-open-git" onclick={onopengit}>{OPEN_GIT_LINK}</button>{/if}
    </div>
  {:else if note}
    <div class="note" data-testid="changes-git-note">{note.text}</div>
  {/if}
  {#if restored}
    <div class="note" data-testid="changes-restored" role="status">{restored}</div>
  {/if}
  {#if reverted.length > 0 && onopenrecyclebin}
    <div class="note line" data-testid="changes-reverted-note">
      <span class="text">{REVERTED_NOTE}</span>
      <button type="button" class="link" data-testid="changes-open-recycle-bin" onclick={() => onopenrecyclebin?.()}>Open Recycle Bin</button>
    </div>
  {/if}
  <!-- The split never gets less than its list and room for about 12 diff lines: the pane scrolls as a whole instead (UX-151, UX-184). -->
  <div class="split" class:beside bind:clientHeight={splitHeight} style:min-height={beside ? undefined : `${Math.max(listHeight, listHeightFor(MIN_ROWS)) + SPLITTER + DIFF_WANTED_HEIGHT}px`}>
    {#if beside}
      <SplitContainer orientation="vertical" bind:splitterDistance={listWidth} panel1MinSize={LIST_MIN_WIDTH} panel2MinSize={DIFF_MIN_WIDTH} fixedPanel="panel2" splitterLabel="Resize the list of changed files" onchange={(w) => writeListSize(localStore(), `${layoutKey}-beside`, w)} panel1={listPanel} panel2={diffPanel} />
    {:else if listHeight > 0}
      <SplitContainer orientation="horizontal" bind:splitterDistance={listHeight} panel1MinSize={LIST_MIN_HEIGHT} panel2MinSize={DIFF_MIN_HEIGHT} fixedPanel="panel1" splitterLabel="Resize the list of changed files" onchange={(h) => h !== autoHeight && writeListSize(localStore(), layoutKey, h)} panel1={listPanel} panel2={diffPanel} />
    {/if}
  </div>
  {#if reason}<div class="reason" id={reasonId} data-testid="changes-reason">{reason}</div>{/if}
  <div class="bottom">
    <span class="summary" data-testid="changes-summary">{changesSummary(changes)}</span>
    <span class="buttons">
      <span title={revertReason ?? undefined}>
        <Button data-testid="changes-revert" disabled={!selected} aria-describedby={revertReason ? reasonId : undefined} onclick={() => void revert()}>Revert</Button>
      </span>
      <span title={editorReason ?? undefined}>
        <Button data-testid="changes-open-editor" disabled={!selected || selected.kind === 'deleted'} aria-describedby={editorReason ? reasonId : undefined} onclick={() => selected && onopeneditor?.(selected)}>Open in editor</Button>
      </span>
    </span>
  </div>
  <ContextMenuStrip bind:open={menu.open} x={menu.x} y={menu.y} items={menu.items} label="Changed files" />
</div>

<style>
  /* The pane never squeezes the list or the diff: when the window is too short it scrolls as a whole. */
  .changes {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
    overflow: auto;
  }
  .split {
    flex: 1;
    min-height: 240px;
    display: flex;
  }
  .split.beside {
    min-height: 130px;
  }
  .split :global(.w7-split) {
    height: auto;
    flex: 1;
  }
  .list {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .list :global(.w7-listview) {
    flex: 1;
    min-height: 0;
  }
  .file {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
  }
  /* The name is never cut at its front or its end: the middle of the stem gets an ellipsis. */
  .name {
    flex: 0 1 auto;
    display: flex;
    min-width: 9em;
    overflow: hidden;
    white-space: nowrap;
  }
  .head {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tail {
    flex: none;
  }
  .kind {
    white-space: nowrap;
  }
  .dir {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--w7-text-muted);
  }
  .reverted,
  .reverted .name {
    color: var(--w7-text-muted);
    font-weight: normal;
  }
  .note,
  .reason {
    flex: none;
    color: var(--w7-text-muted);
  }
  /* One line: the words give way (ellipsis), the link stays. */
  .note.line {
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .note.line .text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .note.line .link {
    flex: none;
  }
  .link {
    min-height: 24px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--w7-link);
    font: inherit;
    text-decoration: underline;
    cursor: default;
  }
  /* The diff has the rest of the height: at least about 12 lines (17 px each) in a window of the default size. */
  .diff {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
  }
  .diff :global(.w7-diffviewer) {
    flex: 1;
  }
  .hint {
    padding: 8px;
    color: var(--w7-text-muted);
  }
  .hint.undone {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    color: var(--w7-text);
  }
  .bottom {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }
  .summary {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--w7-text-muted);
  }
  .buttons {
    flex: none;
    display: flex;
    gap: 6px;
  }
</style>
