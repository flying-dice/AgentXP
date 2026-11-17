<script lang="ts">
  /** One sticky note: a WinXP sticky on the desktop. Presentational; the layer owns the data. */
  import { untrack } from 'svelte'
  import type { Bounds, StickyColor, StickyNoteDto } from '@shared/desktop'
  import type { TaskDto } from '@shared/models'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import type { MenuItemDef } from '../../kit/molecules/MenuItem'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import { NOTE_THEME, STICKY_COLORS, moveNote, planItems, resizeNote } from './noteModel'

  interface Props {
    note: StickyNoteDto
    /** The plan of `note.planSessionId` (plan notes only). */
    tasks?: TaskDto[]
    chatTitle?: string
    z?: number
    area: () => { width: number; height: number }
    onpatch: (patch: Partial<Pick<StickyNoteDto, 'text' | 'color' | 'bounds'>>) => void
    onadd: () => void
    onremove: () => void
    onfront?: () => void
  }

  let { note, tasks = [], chatTitle, z = 1, area, onpatch, onadd, onremove, onfront }: Props = $props()

  // svelte-ignore state_referenced_locally
  let draft = $state(note.text)
  let editing = $state(false)
  let live = $state.raw<Bounds | null>(null)
  const ctx = new ContextMenu()

  const theme = $derived(NOTE_THEME[note.color])
  const bounds = $derived(live ?? note.bounds)
  const isPlan = $derived(note.planSessionId !== null)
  const items = $derived(planItems(tasks))
  const done = $derived(items.filter((i) => i.done).length)

  // Adopt text from outside (the agent edits the note) unless the user is typing in it.
  $effect(() => {
    const text = note.text
    untrack(() => {
      if (!editing) draft = text
    })
  })

  let gesture: { kind: 'move' | 'resize'; x: number; y: number; start: Bounds } | null = null

  function down(kind: 'move' | 'resize', event: PointerEvent): void {
    if (event.button !== 0) return
    onfront?.()
    gesture = { kind, x: event.clientX, y: event.clientY, start: note.bounds }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function move(event: PointerEvent): void {
    if (!gesture) return
    const dx = event.clientX - gesture.x
    const dy = event.clientY - gesture.y
    live = gesture.kind === 'move' ? moveNote(gesture.start, dx, dy, area()) : resizeNote(gesture.start, dx, dy)
  }

  function up(): void {
    const final = live
    gesture = null
    live = null
    if (final && (final.x !== note.bounds.x || final.y !== note.bounds.y || final.width !== note.bounds.width || final.height !== note.bounds.height)) onpatch({ bounds: final })
  }

  const menu = $derived<MenuItemDef[]>([
    ...STICKY_COLORS.map((c: StickyColor): MenuItemDef => ({ id: `notes-ctx-color-${c}`, testid: `notes-ctx-color-${c}`, label: NOTE_THEME[c].label, radio: true, checked: note.color === c, action: () => onpatch({ color: c }) })),
    { separator: true },
    { id: 'notes-ctx-new', testid: 'notes-ctx-new', label: '&New note', icon: 'plus', action: onadd },
    { id: 'notes-ctx-delete', testid: 'notes-ctx-delete', label: '&Delete note', icon: 'delete', action: onremove }
  ])
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<article
  class="note"
  data-testid={isPlan ? 'notes-plan' : 'notes-sticky'}
  data-note-id={note.id}
  data-color={note.color}
  class:agent={note.author === 'agent'}
  style:left="{bounds.x}px"
  style:top="{bounds.y}px"
  style:width="{bounds.width}px"
  style:height="{bounds.height}px"
  style:z-index={z}
  style:--paper={theme.paper}
  style:--bar={theme.bar}
  style:--edge={theme.border}
  aria-label={isPlan ? `Plan note: ${chatTitle ?? ''}` : 'Sticky note'}
  onpointerdown={() => onfront?.()}
  oncontextmenu={(e) => ctx.show(e, menu)}
  onkeydown={(e) => ctx.key(e, menu)}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -- the title bar is a pointer-only drag handle; the note has its own keyboard-reachable buttons -->
  <header class="bar" onpointerdown={(e) => down('move', e)} onpointermove={move} onpointerup={up} onpointercancel={up}>
    <button type="button" class="btn" data-testid="notes-sticky-add" title="New note" aria-label="New note" onpointerdown={(e) => e.stopPropagation()} onclick={onadd}>+</button>
    {#if note.author === 'agent'}<span class="by" title="Written by the agent">AgentXP</span>{/if}
    <span class="spring"></span>
    <button type="button" class="btn" data-testid="notes-sticky-delete" title="Delete note" aria-label="Delete note" onpointerdown={(e) => e.stopPropagation()} onclick={onremove}>×</button>
  </header>
  {#if isPlan}
    <div class="plan xp-scroll" role="list" aria-label="Tasks">
      <div class="head">{chatTitle ?? 'Plan'}</div>
      {#each items as item (item.id)}
        <div class="item" role="listitem" class:done={item.done} class:active={item.active}>
          <CheckBox checked={item.done} readonly><span>{item.text}</span></CheckBox>
        </div>
      {:else}
        <div class="none">No tasks yet.</div>
      {/each}
      {#if items.length > 0}<div class="count">{done} of {items.length} done</div>{/if}
    </div>
  {:else}
    <textarea
      class="text xp-scroll"
      data-testid="notes-sticky-text"
      bind:value={draft}
      aria-label="Note text"
      spellcheck="false"
      placeholder="Type a note…"
      onfocus={() => (editing = true)}
      onblur={() => (editing = false)}
      oninput={() => onpatch({ text: draft })}
    ></textarea>
  {/if}
  <div class="grip" role="separator" aria-label="Resize note" aria-orientation="horizontal" onpointerdown={(e) => down('resize', e)} onpointermove={move} onpointerup={up} onpointercancel={up}></div>
</article>
<ContextMenuStrip items={ctx.items} bind:open={ctx.open} x={ctx.x} y={ctx.y} label="Note menu" />

<style>
  .note {
    position: absolute;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--edge);
    background: var(--paper);
    box-shadow: 2px 3px 8px rgba(0, 0, 0, 0.4);
    pointer-events: auto;
    font-family: 'Segoe Print', 'Segoe UI', 'Comic Sans MS', 'Noto Sans', sans-serif;
  }
  .bar {
    flex: none;
    display: flex;
    align-items: center;
    height: 22px;
    padding: 0 2px;
    background: var(--bar);
    border-bottom: 1px solid var(--edge);
    cursor: move;
    user-select: none;
    touch-action: none;
  }
  .spring {
    flex: 1;
  }
  .by {
    margin-left: 4px;
    font: 11px 'Segoe UI', 'Noto Sans', sans-serif;
    color: rgba(0, 0, 0, 0.55);
  }
  .btn {
    width: 20px;
    height: 18px;
    padding: 0;
    border: 1px solid transparent;
    background: transparent;
    color: rgba(0, 0, 0, 0.6);
    font: 700 16px/16px 'Segoe UI', 'Noto Sans', sans-serif;
    cursor: default;
  }
  .btn:hover {
    border-color: var(--edge);
    background: rgba(255, 255, 255, 0.45);
    color: #000;
  }
  .text {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 6px 8px;
    border: 0;
    outline: 0;
    resize: none;
    background: transparent;
    color: #1a1a1a;
    font: 14px/1.35 'Segoe Print', 'Segoe UI', 'Comic Sans MS', 'Noto Sans', sans-serif;
    user-select: text;
    cursor: text;
  }
  .plan {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 6px 8px 14px;
    font: 13px/1.35 'Segoe UI', 'Noto Sans', sans-serif;
  }
  .head {
    margin-bottom: 4px;
    font-weight: 700;
  }
  .item.done span {
    color: #555;
    text-decoration: line-through;
  }
  .item.active span {
    font-weight: 700;
  }
  .none,
  .count {
    margin-top: 4px;
    color: rgba(0, 0, 0, 0.55);
    font-size: 11px;
  }
  .grip {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
    background: linear-gradient(135deg, transparent 50%, var(--edge) 50%, var(--edge) 56%, transparent 56%, transparent 68%, var(--edge) 68%, var(--edge) 74%, transparent 74%);
    touch-action: none;
  }
</style>
