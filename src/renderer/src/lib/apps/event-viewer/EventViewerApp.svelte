<script lang="ts">
  import { onMount, tick, untrack } from 'svelte'
  import type { EventLevel, ProtocolEventDto } from '@shared/desktop'
  import type { SessionDto } from '@shared/models'
  import type { AppProps } from '../types'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import Icon from '../../kit/atoms/Icon.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import type { DialogResult } from '../../kit/molecules/DialogButtons'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import CodeViewer from '../../kit/organisms/CodeViewer.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn, ListRow } from '../../kit/organisms/ListView'
  import SplitContainer from '../../kit/organisms/SplitContainer.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import TabControl from '../../kit/organisms/TabControl.svelte'
  import TreeView from '../../kit/organisms/TreeView.svelte'
  import type { TreeNodeData } from '../../kit/organisms/TreeView'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { ViewSync } from '../viewSync'
  import { ALL_NODE, LEVEL_ICON, LEVEL_LABEL, SOURCE_LABEL, appendEvents, chatNode, filterEvents, findNext, formatDateTime, generalLines, logTree, nodeScope, summaryOf } from './eventModel'

  let { window: win, host }: AppProps<'event-viewer'> = $props()

  let events = $state.raw<ProtocolEventDto[]>([])
  let sessions = $state.raw<SessionDto[]>([])
  // svelte-ignore state_referenced_locally
  let node = $state<string | null>(win.view.sessionId !== null ? chatNode(win.view.sessionId) : ALL_NODE)
  // svelte-ignore state_referenced_locally
  let level = $state<EventLevel | 'all'>(win.view.level)
  let text = $state('')
  // svelte-ignore state_referenced_locally
  let selected = $state<string[]>(win.view.selectedEventId !== null ? [String(win.view.selectedEventId)] : [])
  let autoscroll = $state(true)
  let tab = $state('general')
  let filtering = $state<{ level: EventLevel | 'all'; text: string } | null>(null)
  let finding = $state<string | null>(null)
  let gridEl = $state<HTMLElement | null>(null)
  let error = $state<string | null>(null)

  const desktopId = $derived(host.state.desktopId)
  const scope = $derived(nodeScope(node))
  const visible = $derived(filterEvents(events, { source: scope.source, sessionId: scope.sessionId, level, text }))
  const current = $derived(events.find((e) => String(e.id) === selected[0]) ?? null)
  const chatTitle = (id: number | null): string | undefined => sessions.find((s) => s.id === id)?.title
  const nodes = $derived<TreeNodeData[]>(logTree(sessions))
  let expanded = $state(new Set<string>(['root', ALL_NODE, 'chats']))

  const sync = new ViewSync<{ sessionId: number | null; level: string }>((v) => JSON.stringify([v.sessionId, v.level]))
  let lastSelected: number | null = null

  function report(): void {
    const selectedEventId = current?.id ?? null
    const moved = sync.mark({ sessionId: scope.sessionId, level })
    if (moved || selectedEventId !== lastSelected) {
      lastSelected = selectedEventId
      host.updateView(win.id, { app: 'event-viewer', sessionId: scope.sessionId, level, selectedEventId })
    }
  }
  $effect(() => {
    void [scope.sessionId, level, current?.id]
    untrack(report)
  })

  // The agent changes the chat or level.
  $effect(() => {
    const view = win.view
    if (!sync.isExternal({ sessionId: view.sessionId, level: view.level })) return
    untrack(() => {
      node = view.sessionId !== null ? chatNode(view.sessionId) : scope.source ? node : ALL_NODE
      level = view.level
    })
  })

  async function refresh(): Promise<void> {
    try {
      const [list2, sess] = await Promise.all([host.api.events.query({ desktopId, limit: 1000 }), host.api.sessions.list(host.state.desktopId)])
      events = list2
      sessions = sess
      error = null
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }

  onMount(() => {
    void refresh()
    return host.api.on('events.appended', (added) => {
      events = appendEvents(
        events,
        added.filter((e) => e.desktopId === desktopId)
      )
    })
  })

  // Autoscroll: stick to the newest row.
  $effect(() => {
    void visible.length
    if (!autoscroll) return
    void tick().then(() => {
      const el = gridEl?.querySelector<HTMLElement>('.w7-listview')
      if (el) el.scrollTop = el.scrollHeight
    })
  })

  async function clearLog(): Promise<void> {
    const answer = await showMessageBox({ text: 'Do you want to clear all the events in the Agent7 logs?', caption: 'Event Viewer', buttons: 'YesNo', icon: 'warning' })
    if (answer !== 'yes') return
    await host.api.events.clear(desktopId)
    events = []
    selected = []
  }

  function finishFilter(result: DialogResult): void {
    if (result === 'ok' && filtering) {
      level = filtering.level
      text = filtering.text
    }
    filtering = null
  }

  function finishFind(result: DialogResult): void {
    const needle = finding
    finding = null
    if (result !== 'ok' || !needle) return
    const at = findNext(visible, needle, visible.findIndex((e) => String(e.id) === selected[0]))
    if (at >= 0) selected = [String(visible[at].id)]
    else void showMessageBox({ text: `Cannot find "${needle}".`, caption: 'Event Viewer', buttons: 'OK', icon: 'information' })
  }

  const columns: ListColumn[] = [
    { key: 'level', header: 'Level', width: 100 },
    { key: 'when', header: 'Date and Time', width: 140 },
    { key: 'source', header: 'Source', width: 56 },
    { key: 'name', header: 'Name', width: 190 },
    { key: 'chat', header: 'Chat' }
  ]
  const rows = $derived<ListRow[]>(
    visible.map((e) => ({ id: String(e.id), icon: LEVEL_ICON[e.level], level: LEVEL_LABEL[e.level], when: formatDateTime(e.at), source: SOURCE_LABEL[e.source], name: `${e.direction === 'in' ? '←' : '→'} ${e.name}`, chat: chatTitle(e.sessionId) ?? '' }))
  )

  const levelItems = (['all', 'info', 'warning', 'error'] as const).map((l) => ({ value: l, label: l === 'all' ? 'All levels' : LEVEL_LABEL[l] }))
  const filterActive = $derived(level !== 'all' || text.trim() !== '')
  const tabs = [
    { id: 'general', title: 'General' },
    { id: 'details', title: 'Details' }
  ]

  const actions: { label: string; icon: 'search' | 'delete' | 'refresh' | 'options'; run: () => void }[] = [
    { label: 'Filter Current Log…', icon: 'options', run: () => (filtering = { level, text }) },
    { label: 'Clear Log', icon: 'delete', run: () => void clearLog() },
    { label: 'Refresh', icon: 'refresh', run: () => void refresh() },
    { label: 'Find…', icon: 'search', run: () => (finding = '') }
  ]
</script>

<div class="ev">
  <div class="body">
    <SplitContainer splitterDistance={176} panel1MinSize={120} panel2MinSize={300} fixedPanel="panel1">
      {#snippet panel1()}
        <TreeView {nodes} bind:selected={node} bind:expanded aria-label="Logs" class="tree" />
      {/snippet}
      {#snippet panel2()}
        <div class="row">
          <div class="main">
            <SplitContainer orientation="horizontal" splitterDistance={190} panel1MinSize={90} panel2MinSize={90} fixedPanel="panel2">
              {#snippet panel1()}
                <div class="center">
                  <div class="heading">
                    <strong>{scope.sessionId !== null ? (chatTitle(scope.sessionId) ?? scope.title) : scope.title}</strong>
                    <span class="count">Number of events: {visible.length}{filterActive ? ' (filtered)' : ''}</span>
                    <span class="spring"></span>
                    <CheckBox bind:checked={autoscroll}>Autoscroll</CheckBox>
                  </div>
                  <div class="grid" bind:this={gridEl}>
                    <ListView {columns} {rows} bind:selected aria-label="Events" emptyText={error ?? 'No events.'} />
                  </div>
                </div>
              {/snippet}
              {#snippet panel2()}
                <div class="detail">
                  {#if current}
                    <div class="dhead"><Icon name={LEVEL_ICON[current.level]} /> <strong>Event {current.id}, {SOURCE_LABEL[current.source]}</strong></div>
                    <TabControl {tabs} bind:selected={tab} aria-label="Event detail">
                      {#snippet panel(t)}
                        {#if t.id === 'general'}
                          <div class="general w7-scroll">
                            {#if summaryOf(current.payload)}<p class="summary">{summaryOf(current.payload)}</p>{/if}
                            <dl>
                              {#each generalLines(current, chatTitle(current.sessionId)) as [k, v] (k)}
                                <dt>{k}:</dt>
                                <dd>{v}</dd>
                              {/each}
                            </dl>
                          </div>
                        {:else}
                          <CodeViewer code={current.payload} language="json" label="Event payload" toolbar wordWrap={false} />
                        {/if}
                      {/snippet}
                    </TabControl>
                  {:else}
                    <p class="none">Select an event to see its details.</p>
                  {/if}
                </div>
              {/snippet}
            </SplitContainer>
          </div>
            <aside class="actions" aria-label="Actions">
              <div class="ahead">Actions</div>
              <div class="asub">{scope.title}</div>
              {#each actions as a (a.label)}
                <button type="button" class="act" onclick={a.run}><Icon name={a.icon} />{a.label}</button>
              {/each}
              {#if filterActive}<button type="button" class="act" onclick={() => ((level = 'all'), (text = ''))}><Icon name="close" />Clear Filter</button>{/if}
            </aside>
        </div>
      {/snippet}
    </SplitContainer>
  </div>
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text={error ?? (autoscroll ? 'Following new events' : 'Autoscroll is off')} spring />
    <StatusStripLabel text="Events: {events.length}" borders={['left']} width={100} />
  </StatusStrip>

  {#if filtering}
    <Dialog title="Filter Current Log" iconName="options" width="360px" contained onclose={() => (filtering = null)}>
      <div class="filter">
        <span>Event level:</span>
        <ComboBox aria-label="Event level" items={levelItems} value={filtering.level} onchange={(v) => filtering && (filtering.level = v as EventLevel | 'all')} />
        <label for="ev-text">Contains text:</label>
        <TextBox id="ev-text" bind:value={filtering.text} />
      </div>
      {#snippet buttons()}
        <DialogButtons buttons={['ok', 'cancel']} onresult={finishFilter} />
      {/snippet}
    </Dialog>
  {/if}
  {#if finding !== null}
    <Dialog title="Find" iconName="search" width="340px" contained onclose={() => (finding = null)}>
      <div class="filter">
        <label for="ev-find">Find what:</label>
        <TextBox id="ev-find" bind:value={finding} onkeydown={(e) => e.key === 'Enter' && finishFind('ok')} />
      </div>
      {#snippet buttons()}
        <DialogButtons buttons={['ok', 'cancel']} onresult={finishFind} />
      {/snippet}
    </Dialog>
  {/if}
</div>

<style>
  .ev {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 4px;
  }
  .body :global(.tree) {
    height: 100%;
  }
  .row {
    height: 100%;
    display: flex;
    gap: 4px;
  }
  .main {
    flex: 1;
    min-width: 0;
    min-height: 0;
  }
  .center {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .heading {
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 24px;
    padding: 0 6px;
    background: linear-gradient(#fdfeff, #e3ecf8);
    border: 1px solid var(--w7-list-border);
    border-bottom: 0;
  }
  .count {
    color: var(--w7-text-muted);
  }
  .spring {
    flex: 1;
  }
  .grid {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .grid :global(.w7-listview) {
    flex: 1;
    min-height: 0;
  }
  .detail {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding-top: 2px;
  }
  .dhead {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 4px 4px;
  }
  .general {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 6px 8px;
    background: var(--w7-window);
    height: 100%;
    box-sizing: border-box;
  }
  .summary {
    margin: 0 0 8px;
    white-space: pre-wrap;
  }
  dl {
    display: grid;
    grid-template-columns: 90px 1fr;
    gap: 2px 8px;
    margin: 0;
  }
  dt {
    color: var(--w7-text-muted);
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .none {
    margin: 0;
    padding: 8px;
    color: var(--w7-text-muted);
  }
  .actions {
    flex: none;
    width: 168px;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
  }
  .ahead {
    padding: 3px 8px;
    background: linear-gradient(#fdfeff, #dce6f4);
    border-bottom: 1px solid var(--w7-list-border);
    font-weight: 700;
  }
  .asub {
    padding: 4px 8px;
    background: #e8eef7;
    font-weight: 700;
    color: #1e3287;
  }
  .act {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border: 1px solid transparent;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: default;
  }
  .act:hover {
    border-color: var(--w7-hot-border);
    background: var(--w7-hot-face);
  }
  .filter {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px;
  }
</style>
