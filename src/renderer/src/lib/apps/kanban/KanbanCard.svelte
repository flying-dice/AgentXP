<script lang="ts">
  /** One card of a Kanban column: the title, the first line of the description and who it is assigned to. Draggable. */
  import type { CardDto } from '@shared/kanban'
  import { cardLabel, descriptionPreview, initials } from './kanbanModel'

  interface Props {
    card: CardDto
    selected?: boolean
    /** The card is being dragged (it dims). */
    dragging?: boolean
    onselect?: () => void
    /** Double-click or Enter: edit the card. */
    onopen?: () => void
    ondragstart?: (event: DragEvent) => void
    ondragend?: (event: DragEvent) => void
    oncontextmenu?: (event: MouseEvent) => void
    onkeydown?: (event: KeyboardEvent) => void
  }

  let { card, selected = false, dragging = false, onselect, onopen, ondragstart, ondragend, oncontextmenu, onkeydown }: Props = $props()

  const preview = $derived(descriptionPreview(card.description))
</script>

<div
  class="card"
  class:selected
  class:dragging
  role="option"
  aria-selected={selected}
  aria-label={cardLabel(card)}
  tabindex={selected ? 0 : -1}
  draggable="true"
  data-testid="kanban-card"
  data-card-id={card.id}
  onclick={onselect}
  ondblclick={onopen}
  {ondragstart}
  {ondragend}
  {oncontextmenu}
  onkeydown={(e) => {
    onkeydown?.(e)
    if (!e.defaultPrevented && e.key === 'Enter') onopen?.()
  }}
>
  <div class="title" data-testid="kanban-card-title">{card.title}</div>
  {#if preview}<div class="desc">{preview}</div>{/if}
  {#if card.assignee}
    <div class="who" data-testid="kanban-card-assignee"><span class="badge" aria-hidden="true">{initials(card.assignee)}</span><span class="name">{card.assignee}</span></div>
  {/if}
</div>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 5px 7px;
    background: linear-gradient(#fff, #f3f6fa);
    border: 1px solid var(--w7-list-border);
    border-radius: 2px;
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.12);
    cursor: default;
    user-select: none;
    outline: none;
  }
  .card:hover:not(.selected) {
    border-color: var(--w7-hot-border);
    background: linear-gradient(var(--w7-hot-face), #fff);
  }
  .card.selected {
    border-color: var(--w7-select-border);
    background: var(--w7-select-face);
  }
  .card:focus-visible {
    outline: 1px dotted #000;
    outline-offset: -3px;
  }
  .card.dragging {
    opacity: 0.45;
  }
  .title {
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .desc {
    color: var(--w7-text-muted);
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    min-width: 0;
  }
  .badge {
    flex: none;
    min-width: 18px;
    height: 16px;
    padding: 0 2px;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #7a95b8;
    background: linear-gradient(#f2f8ff, #c9dcf3);
    color: #1e3287;
    font-size: 9px;
    font-weight: 700;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
