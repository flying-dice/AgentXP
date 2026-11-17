<script lang="ts">
  import { describeBoard, type BoardDto, type CardDto, type ColumnDto } from '@shared/kanban'
  import type { AgentDto } from '@shared/models'
  import type { AppProps } from '../types'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import type { ComboItem } from '../../kit/atoms/ComboBox'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import type { MenuDef, MenuItemDef } from '../../kit/molecules/MenuItem'
  import { closeItems, menuBar } from '../../kit/molecules/standardMenu'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import ToolStrip from '../../kit/organisms/ToolStrip.svelte'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import { useAppContext } from '../shared/appContext.svelte'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import { ViewSync } from '../viewSync'
  import CardDialog from './CardDialog.svelte'
  import KanbanCard from './KanbanCard.svelte'
  import NameDialog from './NameDialog.svelte'
  import { submission, type DialogInput, type KanbanDialog } from './dialogSubmit'
  import { assigneeItems, assigneesOf, cardCount, columnDropIndex, dropIndex, isNoop, targetIndex } from './kanbanModel'

  let { window: win, host }: AppProps<'kanban'> = $props()

  let boards = $state.raw<BoardDto[]>([])
  let agents = $state.raw<AgentDto[]>([])
  let loaded = $state(false)
  // svelte-ignore state_referenced_locally
  let boardId = $state<number | null>(win.view.boardId)
  let selectedCard = $state<number | null>(null)
  let error = $state<string | null>(null)
  /** A prompt or the card dialog that is open. */
  let dialog = $state<KanbanDialog | null>(null)

  /** What is being dragged, and where it would land (the line between cards, or beside columns). */
  let drag = $state<{ kind: 'card' | 'column'; id: number } | null>(null)
  let over = $state<{ kind: 'card'; columnId: number; index: number } | { kind: 'column'; index: number } | null>(null)

  const desktopId = $derived(host.state.desktopId)
  const board = $derived(boards.find((b) => b.id === boardId) ?? boards[0] ?? null)
  const assignees = $derived<ComboItem[]>(assigneeItems(agents, assigneesOf(board)))
  const boardItems = $derived<ComboItem[]>(boards.map((b) => ({ value: String(b.id), label: b.name })))
  const allCards = $derived(board ? board.columns.flatMap((c) => c.cards) : [])
  const current = $derived(allCards.find((c) => c.id === selectedCard) ?? null)
  const sync = new ViewSync<number | null>((id) => String(id))

  async function load(): Promise<void> {
    try {
      boards = await host.api.kanban.list(desktopId)
      error = null
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
    loaded = true
  }

  $effect(() => {
    void desktopId
    void load()
    const off = host.api.on('kanban.changed', (e) => e.desktopId === desktopId && void load())
    return off
  })
  $effect(() => {
    let stale = false
    host.api.agents.list().then((list) => !stale && (agents = list), () => {})
    return () => {
      stale = true
    }
  })

  // The board is part of the window's view: the agent sees which board is open, and the shell can open one.
  $effect(() => {
    const wanted = win.view.boardId
    if (sync.isExternal(wanted) && wanted !== null && wanted !== boardId) boardId = wanted
  })
  $effect(() => {
    const id = board?.id ?? null
    if (loaded && sync.mark(id)) host.updateView(win.id, { app: 'kanban', boardId: id })
  })
  $effect(() => {
    if (selectedCard !== null && !allCards.some((c) => c.id === selectedCard)) selectedCard = null
  })

  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    try {
      const result = await action()
      error = null
      return result
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      return undefined
    }
  }

  const api = $derived(host.api.kanban)

  const deleteBoard = (): void => void (board && run(() => api.deleteBoard(board.id)))
  const deleteCard = (card: CardDto): void => void run(() => api.deleteCard(card.id))
  const moveCardTo = (card: CardDto, columnId: number, index?: number): void => void run(() => api.moveCard(card.id, columnId, index))

  function columnOf(card: CardDto): ColumnDto | undefined {
    return board?.columns.find((c) => c.id === card.columnId)
  }

  /** Alt+arrows and the Move menu: one column or one place over. */
  function nudge(card: CardDto, dx: number, dy: number): void {
    if (!board) return
    const col = columnOf(card)
    if (!col) return
    if (dx !== 0) {
      const next = board.columns[board.columns.indexOf(col) + dx]
      if (next) moveCardTo(card, next.id, Math.min(col.cards.indexOf(card), next.cards.length))
    } else {
      const at = col.cards.indexOf(card) + dy
      if (at >= 0 && at < col.cards.length) moveCardTo(card, col.id, at)
    }
  }

  /** OK in a dialog: the call is built from the dialog first, then the dialog closes. */
  async function finish(input: DialogInput): Promise<void> {
    const open = dialog
    const make = open ? submission(open, input, { desktopId, boardId: board?.id ?? null }) : null
    dialog = null
    if (!open || !make) return
    const result = await run(() => make(api))
    if (open.kind === 'new-board' && result) boardId = result.id
  }

  // ---- drag and drop
  const DRAG_CARD = 'application/x-agentxp-kanban-card'
  const DRAG_COLUMN = 'application/x-agentxp-kanban-column'

  function startDrag(event: DragEvent, kind: 'card' | 'column', id: number): void {
    event.stopPropagation()
    event.dataTransfer?.setData(kind === 'card' ? DRAG_CARD : DRAG_COLUMN, String(id))
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
    drag = { kind, id }
  }
  const endDrag = (): void => {
    drag = null
    over = null
  }

  function overColumn(event: DragEvent, col: ColumnDto): void {
    if (drag?.kind !== 'card') return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    const list = (event.currentTarget as HTMLElement).querySelector('[data-cards]')
    const mids = [...(list?.querySelectorAll('[data-card-id]') ?? [])].map((el) => {
      const r = el.getBoundingClientRect()
      return r.top + r.height / 2
    })
    const raw = dropIndex(mids, event.clientY)
    const ids = col.cards.map((c) => c.id)
    over = isNoop(ids, drag.id, raw) ? null : { kind: 'card', columnId: col.id, index: raw }
  }

  function dropOnColumn(event: DragEvent, col: ColumnDto): void {
    if (drag?.kind !== 'card') return
    event.preventDefault()
    const target = over?.kind === 'card' ? over : null
    const card = allCards.find((c) => c.id === drag?.id)
    endDrag()
    if (!card || !target) return
    moveCardTo(card, col.id, targetIndex(col.cards.map((c) => c.id), card.id, target.index))
  }

  function overCanvas(event: DragEvent): void {
    if (drag?.kind !== 'column' || !board) return
    event.preventDefault()
    const mids = [...(event.currentTarget as HTMLElement).querySelectorAll('[data-column-id]')].map((el) => {
      const r = el.getBoundingClientRect()
      return r.left + r.width / 2
    })
    const raw = columnDropIndex(mids, event.clientX)
    over = isNoop(board.columns.map((c) => c.id), drag.id, raw) ? null : { kind: 'column', index: raw }
  }

  function dropOnCanvas(event: DragEvent): void {
    if (drag?.kind !== 'column' || !board) return
    event.preventDefault()
    const id = drag.id
    const target = over?.kind === 'column' ? over : null
    endDrag()
    if (target) void run(() => api.moveColumn(id, targetIndex(board.columns.map((c) => c.id), id, target.index)))
  }

  // ---- keyboard
  function cardKey(event: KeyboardEvent, card: CardDto): void {
    if (!board) return
    const col = columnOf(card)!
    if (event.altKey && event.key.startsWith('Arrow')) {
      event.preventDefault()
      nudge(card, event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0, event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0)
      return
    }
    if (event.key === 'Delete') {
      event.preventDefault()
      deleteCard(card)
    } else if (event.key === 'F2') {
      event.preventDefault()
      dialog = { kind: 'edit-card', card }
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const next = col.cards[col.cards.indexOf(card) + (event.key === 'ArrowDown' ? 1 : -1)]
      if (next) pick(next.id)
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const next = board.columns[board.columns.indexOf(col) + (event.key === 'ArrowRight' ? 1 : -1)]?.cards[0]
      if (next) pick(next.id)
    }
  }

  /** Selects a card and moves the keyboard focus to it (after the roving tabindex updated). */
  function pick(id: number): void {
    selectedCard = id
    queueMicrotask(() => requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-testid="kanban-app"] [data-card-id="${id}"]`)?.focus()))
  }

  // ---- menus
  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'kanban')
  const ctx = new ContextMenu()

  const moveItems = (card: CardDto): MenuItemDef[] =>
    (board?.columns ?? []).map((c) => ({ label: c.name, radio: true, checked: c.id === card.columnId, disabled: c.id === card.columnId, action: () => moveCardTo(card, c.id) }))
  const assignItems = (card: CardDto): MenuItemDef[] => [
    ...assignees.map((a) => ({ label: a.label, radio: true, checked: card.assignee === a.value, action: () => void run(() => api.updateCard(card.id, { assignee: a.value })) })),
    { separator: true } as MenuItemDef,
    { label: 'Nobody', disabled: card.assignee === null, action: () => void run(() => api.updateCard(card.id, { assignee: '' })) }
  ]

  const cardItems = (card: CardDto): MenuItemDef[] => [
    { id: 'kanban-ctx-edit', testid: 'kanban-ctx-edit', label: '&Edit card...', icon: 'edit', shortcut: 'F2', action: () => (dialog = { kind: 'edit-card', card }) },
    { id: 'kanban-ctx-move', testid: 'kanban-ctx-move', label: '&Move to', items: moveItems(card) },
    { id: 'kanban-ctx-assign', testid: 'kanban-ctx-assign', label: '&Assign to', items: assignItems(card) },
    { separator: true },
    { id: 'kanban-ctx-delete-card', testid: 'kanban-ctx-delete-card', label: '&Delete card', icon: 'delete', shortcut: 'Del', action: () => deleteCard(card) }
  ]

  const columnItems = (col: ColumnDto): MenuItemDef[] => {
    const at = board?.columns.findIndex((c) => c.id === col.id) ?? 0
    const last = (board?.columns.length ?? 1) - 1
    return [
      { id: 'kanban-ctx-add-card', testid: 'kanban-ctx-add-card', label: 'Add &card...', icon: 'plus', action: () => (dialog = { kind: 'new-card', columnId: col.id }) },
      { id: 'kanban-ctx-rename-list', testid: 'kanban-ctx-rename-list', label: '&Rename list...', icon: 'edit', action: () => (dialog = { kind: 'rename-column', column: col }) },
      { id: 'kanban-ctx-list-left', testid: 'kanban-ctx-list-left', label: 'Move list &left', disabled: at <= 0, action: () => void run(() => api.moveColumn(col.id, at - 1)) },
      { id: 'kanban-ctx-list-right', testid: 'kanban-ctx-list-right', label: 'Move list r&ight', disabled: at >= last, action: () => void run(() => api.moveColumn(col.id, at + 1)) },
      { separator: true },
      { id: 'kanban-ctx-delete-list', testid: 'kanban-ctx-delete-list', label: '&Delete list', icon: 'delete', action: () => void run(() => api.deleteColumn(col.id)) }
    ]
  }

  const backgroundItems = (): MenuItemDef[] => [
    { id: 'kanban-ctx-new-list', testid: 'kanban-ctx-new-list', label: 'New &list...', icon: 'plus', disabled: !board, action: () => (dialog = { kind: 'new-column' }) },
    { id: 'kanban-ctx-new-board', testid: 'kanban-ctx-new-board', label: 'New &board...', icon: 'kanban', action: () => (dialog = { kind: 'new-board' }) }
  ]

  const appItems = (): MenuItemDef[] => (current ? cardItems(current) : backgroundItems())

  const firstColumn = $derived(board?.columns[0] ?? null)
  const newCard = (): void => {
    const col = (current ? columnOf(current) : null) ?? firstColumn
    if (col) dialog = { kind: 'new-card', columnId: col.id }
  }

  useAppContext(host, () => win.id, () => (board ? { board: describeBoard(board), selectedCard: current ? { id: current.id, title: current.title } : null } : { board: null }))

  const menus = $derived<MenuDef[]>(
    menuBar([
      {
        label: '&File',
        items: [
          { id: 'new-board', testid: 'kanban-menu-new-board', label: 'New &board...', icon: 'kanban', shortcut: 'Ctrl+N', action: () => (dialog = { kind: 'new-board' }) },
          { id: 'rename-board', testid: 'kanban-menu-rename-board', label: '&Rename board...', disabled: !board, action: () => (dialog = { kind: 'rename-board' }) },
          { id: 'delete-board', testid: 'kanban-menu-delete-board', label: '&Delete board', icon: 'delete', disabled: !board, action: deleteBoard },
          ...closeItems('kanban', () => void host.closeWindow(win.id))
        ]
      },
      {
        label: '&Edit',
        items: [
          { id: 'new-list', testid: 'kanban-menu-new-list', label: 'New &list...', icon: 'plus', disabled: !board, action: () => (dialog = { kind: 'new-column' }) },
          { id: 'new-card', testid: 'kanban-menu-new-card', label: 'New &card...', icon: 'plus', disabled: !firstColumn, action: newCard },
          { separator: true },
          { id: 'edit-card', testid: 'kanban-menu-edit-card', label: '&Edit card...', icon: 'edit', shortcut: 'F2', disabled: !current, action: () => current && (dialog = { kind: 'edit-card', card: current }) },
          { id: 'delete-card', testid: 'kanban-menu-delete-card', label: '&Delete card', icon: 'delete', shortcut: 'Del', disabled: !current, action: () => current && deleteCard(current) }
        ]
      },
      help.viewMenu(win.id),
      help.menu()
    ])
  )

  const total = $derived(cardCount(board))
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="kb" data-testid="kanban-app" oncontextmenu={(e) => ctx.show(e, backgroundItems())} onkeydown={(e) => ctx.key(e, appItems)}>
  <MenuStrip {menus} aria-label="Kanban menu" />
  <ToolStrip aria-label="Kanban">
    <ToolStripButton data-testid="kanban-new-board" icon="kanban" text="New board" onclick={() => (dialog = { kind: 'new-board' })} />
    <ToolStripButton data-testid="kanban-new-list" icon="plus" text="New list" disabled={!board} onclick={() => (dialog = { kind: 'new-column' })} />
    <ToolStripButton data-testid="kanban-new-card" icon="plus" text="New card" disabled={!firstColumn} onclick={newCard} />
  </ToolStrip>

  <div class="bar">
    <span>Board:</span>
    <ComboBox
      testid="kanban-board-picker"
      style="width: 220px"
      items={boardItems}
      value={board ? String(board.id) : ''}
      placeholder="No boards"
      disabled={boards.length === 0}
      aria-label="Board"
      onchange={(v) => {
        boardId = Number(v)
        selectedCard = null
      }}
    />
  </div>

  {#if error}<p class="error" role="alert" data-testid="kanban-error">{error}</p>{/if}

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="canvas xp-scroll" data-testid="kanban-board" ondragover={overCanvas} ondrop={dropOnCanvas}>
    {#if board}
      {#each board.columns as col, ci (col.id)}
        {#if over?.kind === 'column' && over.index === ci}<div class="col-gap" data-testid="kanban-drop-column"></div>{/if}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <section
          class="col"
          class:dragging={drag?.kind === 'column' && drag.id === col.id}
          data-testid="kanban-column"
          data-column-id={col.id}
          aria-label={col.name}
          ondragover={(e) => overColumn(e, col)}
          ondrop={(e) => dropOnColumn(e, col)}
          oncontextmenu={(e) => ctx.show(e, columnItems(col))}
        >
          <header class="head" draggable="true" data-testid="kanban-column-header" ondragstart={(e) => startDrag(e, 'column', col.id)} ondragend={endDrag}>
            <span class="name" data-testid="kanban-column-name">{col.name}</span>
            <span class="count">{col.cards.length}</span>
            <button
              type="button"
              class="more"
              data-testid="kanban-column-menu"
              aria-label="List menu for {col.name}"
              title="List menu"
              onclick={(e) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                ctx.showAt(r.left, r.bottom, columnItems(col))
                e.stopPropagation()
              }}>▾</button>
          </header>
          <div class="cards" data-cards role="listbox" aria-label="{col.name} cards" aria-orientation="vertical">
            {#each col.cards as card, i (card.id)}
              {#if over?.kind === 'card' && over.columnId === col.id && over.index === i}<div class="gap" data-testid="kanban-drop-card"></div>{/if}
              <KanbanCard
                {card}
                selected={selectedCard === card.id}
                dragging={drag?.kind === 'card' && drag.id === card.id}
                onselect={() => (selectedCard = card.id)}
                onopen={() => (dialog = { kind: 'edit-card', card })}
                ondragstart={(e) => startDrag(e, 'card', card.id)}
                ondragend={endDrag}
                oncontextmenu={(e) => ((selectedCard = card.id), ctx.show(e, cardItems(card)))}
                onkeydown={(e) => cardKey(e, card)}
              />
            {/each}
            {#if over?.kind === 'card' && over.columnId === col.id && over.index >= col.cards.length}<div class="gap" data-testid="kanban-drop-card"></div>{/if}
          </div>
          <button type="button" class="add" data-testid="kanban-add-card" onclick={() => (dialog = { kind: 'new-card', columnId: col.id })}>Add a card...</button>
        </section>
      {/each}
      {#if over?.kind === 'column' && over.index >= board.columns.length}<div class="col-gap" data-testid="kanban-drop-column"></div>{/if}
      <button type="button" class="add-col" data-testid="kanban-add-list" onclick={() => (dialog = { kind: 'new-column' })}>Add a list...</button>
    {:else if loaded}
      <div class="empty" data-testid="kanban-empty">
        <p>There are no boards yet. A board holds lists of cards, such as To do, Doing and Done, and the agents can read and write it.</p>
        <button type="button" class="add-col" data-testid="kanban-empty-new" onclick={() => (dialog = { kind: 'new-board' })}>New board...</button>
      </div>
    {/if}
  </div>

  <ContextMenuStrip bind:open={ctx.open} x={ctx.x} y={ctx.y} items={ctx.items} label="Kanban" />
  <AppAbout {help} />

  {#if dialog?.kind === 'new-board'}
    <NameDialog testid="kanban-board-name" title="New board" label="Board name:" onok={finish} oncancel={() => (dialog = null)} />
  {:else if dialog?.kind === 'rename-board' && board}
    <NameDialog testid="kanban-board-name" title="Rename board" label="Board name:" value={board.name} onok={finish} oncancel={() => (dialog = null)} />
  {:else if dialog?.kind === 'new-column'}
    <NameDialog testid="kanban-list-name" title="New list" label="List name:" onok={finish} oncancel={() => (dialog = null)} />
  {:else if dialog?.kind === 'rename-column'}
    <NameDialog testid="kanban-list-name" title="Rename list" label="List name:" value={dialog.column.name} onok={finish} oncancel={() => (dialog = null)} />
  {:else if dialog?.kind === 'new-card'}
    <CardDialog title="New card" {assignees} onok={finish} oncancel={() => (dialog = null)} />
  {:else if dialog?.kind === 'edit-card'}
    <CardDialog title="Card properties" card={dialog.card} {assignees} onok={finish} oncancel={() => (dialog = null)} />
  {/if}

  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text={board ? `${board.columns.length} list${board.columns.length === 1 ? '' : 's'}, ${total} card${total === 1 ? '' : 's'}` : 'No board'} spring />
  </StatusStrip>
</div>

<style>
  .kb {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--xp-face);
  }
  .bar {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
  }
  .error {
    flex: none;
    margin: 0 8px 4px;
    padding: 3px 6px;
    border: 1px solid #c42b1c;
    background: #fdecea;
    color: #7a1a10;
  }
  .canvas {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 0 8px 6px;
    padding: 8px;
    overflow: auto;
    background: linear-gradient(#e9eff7, #d7e1ee);
    border: 1px solid var(--xp-list-border);
  }
  .col {
    flex: none;
    width: 232px;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    background: #f0f3f8;
    border: 1px solid #a9b7ca;
    border-radius: 2px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  }
  .col.dragging {
    opacity: 0.5;
  }
  .head {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 4px 3px 8px;
    background: linear-gradient(#f9fbfe, #dbe5f1);
    border-bottom: 1px solid #a9b7ca;
    cursor: default;
    user-select: none;
  }
  .name {
    flex: 1;
    min-width: 0;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .count {
    color: var(--xp-text-muted);
    font-size: 11px;
  }
  .more {
    width: 20px;
    height: 20px;
    padding: 0;
    border: 1px solid transparent;
    background: transparent;
    font: inherit;
    line-height: 16px;
    cursor: default;
  }
  .more:hover {
    border-color: var(--xp-btn-hover-border);
    background: var(--xp-btn-hover-face);
  }
  .cards {
    flex: 0 1 auto;
    min-height: 28px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 6px;
    overflow: auto;
  }
  /* The drop lines take no room (the flex gap around them is cancelled), so the layout does not move under the pointer. */
  .gap {
    flex: none;
    position: relative;
    height: 0;
    margin: -2.5px 0;
    pointer-events: none;
  }
  .gap::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: -1px;
    height: 3px;
    background: var(--xp-select-border);
  }
  .col-gap {
    flex: none;
    position: relative;
    align-self: stretch;
    width: 0;
    margin: 0 -4px;
    pointer-events: none;
  }
  .col-gap::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: -1px;
    width: 3px;
    background: var(--xp-select-border);
  }
  .add,
  .add-col {
    flex: none;
    border: 0;
    background: transparent;
    font: inherit;
    text-align: left;
    color: #1e3287;
    padding: 5px 8px;
    cursor: default;
  }
  .add:hover,
  .add-col:hover {
    background: var(--xp-hot-face);
    text-decoration: underline;
  }
  .add-col {
    width: 200px;
    border: 1px dashed #a9b7ca;
    border-radius: 2px;
  }
  .empty {
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    max-width: 420px;
  }
  .empty p {
    margin: 0;
  }
</style>
