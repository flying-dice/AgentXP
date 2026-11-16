<script lang="ts">
  import { tick, untrack } from 'svelte'
  import type { FileChangeDto } from '@shared/models'
  import type { AppProps } from '../types'
  import ChangesPane from '../../app/shell/ChangesPane.svelte'
  import FileTree from '../../app/shell/FileTree.svelte'
  import Icon from '../../kit/atoms/Icon.svelte'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import CodeViewer from '../../kit/organisms/CodeViewer.svelte'
  import { languageFromPath } from '../../kit/organisms/highlighter'
  import SplitContainer from '../../kit/organisms/SplitContainer.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { normaliseVPath, vpathName } from '@shared/vfs'
  import { driveRoot, driveTitle, sortDrives } from '../explorer/explorerModel'
  import { errorText } from '../shared/listing'
  import { useDesktopStores } from '../sessionStores.svelte'
  import { ViewSync } from '../viewSync'
  import { closeTab, openTab, reconcileTabs, sameRange, scrollTopForLine, visibleRange } from './codeModel'

  let { window: win, host }: AppProps<'code'> = $props()

  const desktopId = $derived(host.state.desktopId)
  /** The tree shows every plugged-in project; with none, the agent's home. */
  const roots = $derived.by(() => {
    const usb = sortDrives(host.state.drives).filter((d) => d.kind === 'removable')
    return usb.length > 0 ? usb.map((d) => ({ path: driveRoot(d.letter), name: driveTitle(d) })) : [{ path: host.state.home, name: vpathName(host.state.home) }]
  })
  const rootsKey = $derived(roots.map((r) => r.path).join('|'))

  let tabs = $state<string[]>([])
  let active = $state<string | null>(null)
  let visible = $state.raw<[number, number] | null>(null)
  let selection = $state.raw<{ startLine: number; endLine: number } | null>(null)
  let selectedChangeId = $state<number | null>(null)
  let showChanges = $state(true)
  let files = $state.raw<Record<string, { text: string | null; error: string | null }>>({})
  /** Lines the agent asked to reveal; highlighted until another file is shown. */
  let revealed = $state.raw<[number, number] | null>(null)
  let host_el = $state<HTMLDivElement | null>(null)
  let reportedVisible: [number, number] | null = null

  const sync = new ViewSync<{ tabs: string[]; activePath: string | null; visibleLines: [number, number] | null; selectedChangeId: number | null }>((v) =>
    JSON.stringify([v.tabs, v.activePath, v.visibleLines, v.selectedChangeId])
  )

  function report(): void {
    const view = { tabs: [...tabs], activePath: active, visibleLines: visible ? ([...visible] as [number, number]) : null, selectedChangeId }
    if (sync.mark(view)) host.updateView(win.id, { app: 'code', ...view, selection })
  }

  // Everything the agents of this desktop did: all their changes and edit tool calls.
  // svelte-ignore state_referenced_locally
  const desktop = useDesktopStores(host)
  const stores = $derived(desktop.list)
  const changes = $derived<FileChangeDto[]>(stores.flatMap((s) => s.state.changes))
  const changedPaths = $derived(changes.map((c) => normaliseVPath(c.path) ?? c.path))
  const editing = $derived(
    active !== null &&
      stores.some((s) =>
        Object.values(s.state.toolCalls).some(
          (c) =>
            c.kind === 'edit' &&
            (c.status === 'in_progress' || c.status === 'pending') &&
            c.locations.some((l) => normaliseVPath(l.path) === active)
        )
      )
  )
  /** Changes to the active file, so the text is re-read when an edit lands. */
  const activeChangeKey = $derived(
    JSON.stringify(changes.filter((c) => normaliseVPath(c.path) === active).map((c) => [c.id, c.additions, c.deletions, c.kind]))
  )

  async function loadFile(path: string): Promise<void> {
    try {
      const text = await host.api.vfs.readFile(desktopId, path)
      files = { ...files, [path]: { text, error: null } }
    } catch (error) {
      files = { ...files, [path]: { text: null, error: errorText(error) } }
    }
  }

  // Load the text of every tab that has none yet.
  $effect(() => {
    for (const path of tabs) {
      if (!(path in untrack(() => files))) {
        files = { ...untrack(() => files), [path]: { text: null, error: null } }
        void loadFile(path)
      }
    }
  })

  // Reload the active file when the agent changed it.
  let lastChangeKey = ''
  $effect(() => {
    const key = activeChangeKey
    untrack(() => {
      if (key === lastChangeKey) return
      lastChangeKey = key
      if (active && active in files) void loadFile(active)
    })
  })

  function show(path: string): void {
    const next = openTab({ tabs, active }, path)
    tabs = next.tabs
    active = next.active
    visible = null
    selection = null
    revealed = null
    report()
  }

  function close(path: string): void {
    const next = closeTab({ tabs, active }, path)
    tabs = next.tabs
    if (next.active !== active) {
      active = next.active
      visible = null
      selection = null
      revealed = null
    }
    report()
  }

  // The agent opens a file, reveals lines or picks a change.
  $effect(() => {
    const view = win.view
    if (!sync.isExternal({ tabs: view.tabs, activePath: view.activePath, visibleLines: view.visibleLines, selectedChangeId: view.selectedChangeId })) return
    untrack(() => {
      const next = reconcileTabs(view.tabs.map((t) => normaliseVPath(t) ?? t), view.activePath ? (normaliseVPath(view.activePath) ?? view.activePath) : null)
      const changedFile = next.active !== active
      tabs = next.tabs
      active = next.active
      selectedChangeId = view.selectedChangeId
      if (changedFile) {
        selection = null
        revealed = null
      }
      if (view.visibleLines && !sameRange(view.visibleLines, reportedVisible)) {
        revealed = view.visibleLines
        visible = view.visibleLines
        void reveal(view.visibleLines[0])
      } else if (changedFile) visible = null
    })
  })

  const scroller = (): HTMLElement | null => host_el?.querySelector<HTMLElement>('.w7-codeviewer .scroll') ?? null
  const lineHeight = (): number => host_el?.querySelector<HTMLElement>('.w7-codeviewer .row')?.offsetHeight || 17

  async function reveal(line: number): Promise<void> {
    await tick()
    // The text may still be loading: wait a few frames for the rows.
    for (let i = 0; i < 20 && !scroller()?.querySelector('.row'); i++) await new Promise((r) => setTimeout(r, 30))
    const el = scroller()
    if (el) el.scrollTop = scrollTopForLine(line, el.clientHeight, lineHeight())
  }

  const text = $derived(active ? (files[active]?.text ?? null) : null)
  const totalLines = $derived(text === null ? 0 : text.split('\n').length)

  function measure(): void {
    const el = scroller()
    if (!el || text === null) return
    const next = visibleRange(el.scrollTop, el.clientHeight, lineHeight(), totalLines)
    if (sameRange(next, visible)) return
    visible = next
    reportedVisible = next
    report()
  }

  function readSelection(): void {
    const el = scroller()
    const sel = window.getSelection()
    if (!el || !sel || sel.isCollapsed || !sel.anchorNode || !el.contains(sel.anchorNode)) {
      if (selection !== null) {
        selection = null
        report()
      }
      return
    }
    const rows = [...el.querySelectorAll('.row')]
    const lineOf = (node: Node | null): number => {
      const row = (node instanceof Element ? node : node?.parentElement)?.closest('.row')
      return row ? rows.indexOf(row) + 1 : 0
    }
    const a = lineOf(sel.anchorNode)
    const b = lineOf(sel.focusNode)
    if (a === 0 || b === 0) return
    const next = { startLine: Math.min(a, b), endLine: Math.max(a, b) }
    if (selection?.startLine === next.startLine && selection.endLine === next.endLine) return
    selection = next
    report()
  }

  // Follow scrolling and selection of the code viewer (its scroller is re-created per file).
  $effect(() => {
    void active
    void text
    let frame = 0
    let el: HTMLElement | null = null
    const onScroll = (): void => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    void tick().then(() => {
      el = scroller()
      el?.addEventListener('scroll', onScroll, { passive: true })
      el?.addEventListener('mouseup', readSelection)
      el?.addEventListener('keyup', readSelection)
      measure()
    })
    return () => {
      cancelAnimationFrame(frame)
      el?.removeEventListener('scroll', onScroll)
      el?.removeEventListener('mouseup', readSelection)
      el?.removeEventListener('keyup', readSelection)
    }
  })

  async function revert(change: FileChangeDto): Promise<void> {
    const answer = await showMessageBox({
      text: `Revert the changes to ${change.path}?\n\nThe file goes back to how it was before the agent edited it.`,
      caption: 'Code',
      buttons: 'YesNo',
      icon: 'warning'
    })
    if (answer !== 'yes') return
    try {
      await host.api.sessions.revertChange(change.id)
      await desktop.stores.open(change.sessionId).connect()
      selectedChangeId = null
      report()
      await loadFile(change.path)
    } catch (error) {
      await showMessageBox({ text: error instanceof Error ? error.message : String(error), caption: 'Code', buttons: 'OK', icon: 'error' })
    }
  }

  const highlightLines = $derived(revealed ? Array.from({ length: Math.min(80, revealed[1] - revealed[0] + 1) }, (_, i) => revealed![0] + i) : [])
  const language = $derived(active ? languageFromPath(active) : 'text')
  const lineLabel = $derived(visible ? `Lines ${visible[0]}-${visible[1]} of ${totalLines}` : '')
</script>

<div class="code">
  <div class="bar">
    <ToolStripButton icon="changes" text={changes.length > 0 ? `Changes (${changes.length})` : 'Changes'} bind:checked={showChanges} checkOnClick />
    <span class="spring"></span>
    {#if editing}
      <span class="editing" role="status"><Icon name="edit" /> Agent is editing {active ? vpathName(active) : ''}</span>
    {/if}
  </div>
  <div class="work">
    <SplitContainer splitterDistance={190} panel1MinSize={120} panel2MinSize={260} fixedPanel="panel1">
      {#snippet panel1()}
        <div class="tree">
          {#key rootsKey}
            <FileTree {roots} readDir={(p) => host.api.vfs.readDir(desktopId, p)} {changedPaths} onopen={show} />
          {/key}
        </div>
      {/snippet}
      {#snippet panel2()}
        {#snippet editor()}
          <div class="editor">
            <div class="tabs" role="tablist" aria-label="Open files">
              {#each tabs as tab (tab)}
                <div class="tab" class:on={tab === active} role="presentation">
                  <button class="name" role="tab" aria-selected={tab === active} title={tab} onclick={() => show(tab)}>
                    <Icon name="file-code" />{vpathName(tab)}{#if changedPaths.includes(tab)}<span class="mod" title="Changed by the agent">*</span>{/if}
                  </button>
                  <button class="x" aria-label="Close {vpathName(tab)}" onclick={() => close(tab)}>&times;</button>
                </div>
              {/each}
            </div>
            <div class="view" bind:this={host_el}>
              {#if active === null}
                <div class="hint">Open a file from the tree to view it here.</div>
              {:else if files[active]?.error}
                <div class="hint">{files[active].error}</div>
              {:else if text === null}
                <div class="hint">Loading...</div>
              {:else}
                {#key active}
                  <CodeViewer code={text} {language} {highlightLines} label={active} />
                {/key}
              {/if}
            </div>
          </div>
        {/snippet}
        {#if showChanges}
          <SplitContainer orientation="horizontal" splitterDistance={250} panel1MinSize={120} panel2MinSize={140} fixedPanel="panel2">
            {#snippet panel1()}{@render editor()}{/snippet}
            {#snippet panel2()}
              <div class="changes">
                <ChangesPane
                  {changes}
                  bind:selectedId={selectedChangeId}
                  onrevert={(c) => void revert(c)}
                  onopeneditor={(c) => show(c.path)}
                />
              </div>
            {/snippet}
          </SplitContainer>
        {:else}
          {@render editor()}
        {/if}
      {/snippet}
    </SplitContainer>
  </div>
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text={active ?? 'Ready'} spring />
    {#if lineLabel}<StatusStripLabel text={lineLabel} borders={['left']} />{/if}
    {#if selection}<StatusStripLabel text="Selected {selection.startLine}-{selection.endLine}" borders={['left']} />{/if}
    <StatusStripLabel text={language} borders={['left']} width={90} />
  </StatusStrip>
</div>

<style>
  .code {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
  }
  .bar {
    flex: none;
    display: flex;
    align-items: center;
    gap: 4px;
    height: 32px;
    padding: 0 6px;
    background: linear-gradient(#fafcfe, #dce6f4);
    border-bottom: 1px solid #aab7cb;
  }
  .spring {
    flex: 1;
  }
  .editing {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px 2px 5px;
    color: #5c3b00;
    background: linear-gradient(#fff4c8, #ffe28a);
    border: 1px solid #d6b34a;
    border-radius: 2px;
  }
  .work {
    flex: 1;
    min-height: 0;
    display: flex;
    padding: 4px;
  }
  .work :global(.w7-split) {
    flex: 1;
  }
  .tree {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
  }
  .editor {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .tabs {
    flex: none;
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 24px;
    padding: 0 4px;
    background: linear-gradient(#e9eff8, #d7e1f0);
    border: 1px solid var(--w7-list-border);
    border-bottom: 0;
    overflow: hidden;
  }
  .tab {
    display: flex;
    align-items: center;
    height: 21px;
    padding: 0 2px 0 4px;
    background: linear-gradient(#f4f7fb, #dbe4f1);
    border: 1px solid #98a8c0;
    border-bottom: 0;
    border-radius: 3px 3px 0 0;
  }
  .tab.on {
    height: 23px;
    background: var(--w7-window);
    border-top: 2px solid var(--w7-tab-accent);
  }
  .name,
  .x {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0 2px;
    border: 0;
    background: transparent;
    font: inherit;
    cursor: default;
  }
  .x {
    width: 16px;
    justify-content: center;
    color: #555;
    font-size: 14px;
  }
  .x:hover {
    color: #fff;
    background: #c4503e;
  }
  .mod {
    color: #b05a00;
    font-weight: 700;
  }
  .view {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .view :global(.w7-codeviewer) {
    flex: 1;
  }
  .hint {
    flex: 1;
    padding: 8px;
    color: var(--w7-text-muted);
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
  }
  .changes {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
    border: 1px solid var(--w7-panel-border);
  }
</style>
