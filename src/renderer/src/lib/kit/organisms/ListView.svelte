<script lang="ts">
  import Icon from '../atoms/Icon.svelte'
  import ColumnHeader from '../molecules/ColumnHeader.svelte'
  import type { SortDirection } from '../molecules/ColumnHeader'
  import type { Snippet } from 'svelte'
  import { rangeIds, sortRows, type ListColumn, type ListRow, type ListViewMode } from './ListView'

  interface Props {
    view?: ListViewMode
    columns: ListColumn[]
    rows: ListRow[]
    /** Ids of the selected rows. */
    selected?: string[]
    multiSelect?: boolean
    sortKey?: string
    sortDirection?: SortDirection
    /** Shown when there are no rows. */
    emptyText?: string
    onselect?: (ids: string[]) => void
    /** Enter or double click. */
    onactivate?: (row: ListRow) => void
    onsort?: (key: string, direction: SortDirection) => void
    /** Right click on a row (the row is selected first); the browser menu is suppressed. */
    oncontextmenu?: (row: ListRow, event: MouseEvent) => void
    class?: string
    'aria-label'?: string
    /** `data-testid` of the list itself. */
    testid?: string
    /** `data-testid` of every row; a row's own `testid` field wins. Rows also carry `data-row-id`. */
    rowTestid?: string
    /** Draws a cell of the Details view instead of its text (for example a bold name with a grey folder beside it). */
    cell?: Snippet<[ListRow, ListColumn]>
  }

  let {
    view = 'Details',
    columns,
    rows,
    selected = $bindable([]),
    multiSelect = false,
    sortKey = $bindable(''),
    sortDirection = $bindable('none'),
    emptyText = '',
    onselect,
    onactivate,
    onsort,
    oncontextmenu,
    class: className = '',
    'aria-label': ariaLabel = 'List',
    testid,
    rowTestid,
    cell
  }: Props = $props()

  const uid = $props.id()

  function rowMenu(row: ListRow, event: MouseEvent): void {
    if (!oncontextmenu) return
    event.preventDefault()
    if (!selected.includes(row.id)) pick(shown.indexOf(row), { ctrl: false, shift: false })
    oncontextmenu(row, event)
  }
  let widths = $state<Record<string, number>>({})
  let activeId = $state<string | null>(null)
  let anchor = -1
  let focused = $state(false)
  let root = $state<HTMLElement | null>(null)

  const shown = $derived(sortRows(rows, sortKey, sortDirection))
  const details = $derived(view === 'Details')
  const textKey = $derived(columns[0]?.key ?? 'id')
  const widthOf = (c: ListColumn): number | undefined => widths[c.key] ?? c.width
  const minWidth = $derived(columns.reduce((sum, c) => sum + (widthOf(c) ?? 80), 0))
  const activeIndex = $derived(shown.findIndex((r) => r.id === activeId))
  const domId = (id: string): string => `${uid}-${id}`

  function commit(ids: string[]): void {
    selected = ids
    onselect?.(ids)
  }

  function pick(index: number, mods: { ctrl: boolean; shift: boolean }): void {
    const row = shown[index]
    if (!row) return
    activeId = row.id
    if (multiSelect && mods.shift && anchor >= 0) commit(rangeIds(shown, anchor, index))
    else if (multiSelect && mods.ctrl) {
      anchor = index
      commit(selected.includes(row.id) ? selected.filter((i) => i !== row.id) : [...selected, row.id])
    } else {
      anchor = index
      commit([row.id])
    }
  }

  function move(index: number, event: KeyboardEvent): void {
    const i = Math.max(0, Math.min(shown.length - 1, index))
    if (event.ctrlKey && multiSelect) activeId = shown[i].id
    else pick(i, { ctrl: false, shift: event.shiftKey })
  }

  function sortBy(key: string): void {
    sortDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc'
    sortKey = key
    onsort?.(key, sortDirection)
  }

  function onkeydown(event: KeyboardEvent): void {
    if (shown.length === 0 || event.altKey) return
    const at = activeIndex < 0 ? (selected.length ? shown.findIndex((r) => r.id === selected[0]) : -1) : activeIndex
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        move(at + 1, event)
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        move(at < 0 ? 0 : at - 1, event)
        break
      case 'PageDown':
        move(at + 10, event)
        break
      case 'PageUp':
        move(at - 10, event)
        break
      case 'Home':
        move(0, event)
        break
      case 'End':
        move(shown.length - 1, event)
        break
      case 'a':
        if (!event.ctrlKey || !multiSelect) return
        commit(shown.map((r) => r.id))
        break
      case ' ':
        if (!event.ctrlKey) return
        pick(Math.max(0, at), { ctrl: true, shift: false })
        break
      case 'Enter':
        if (at >= 0) onactivate?.(shown[at])
        break
      default:
        return
    }
    event.preventDefault()
  }

  $effect(() => {
    if (!activeId) return
    root?.querySelector(`#${CSS.escape(domId(activeId))}`)?.scrollIntoView({ block: 'nearest' })
  })

  /** Extra `data-*` attributes a row carries in its `attrs` field. */
  const rowAttrs = (row: ListRow): Record<string, string> => (typeof row.attrs === 'object' && row.attrs !== null ? (row.attrs as Record<string, string>) : {})
  const cellText = (row: ListRow, key: string): string => String(row[key] ?? '')
</script>

{#snippet empty()}
  {#if rows.length === 0 && emptyText}<div class="empty">{emptyText}</div>{/if}
{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role, a11y_no_noninteractive_tabindex -->
<div
  bind:this={root}
  class="w7-listview w7-scroll {view} {className}"
  data-testid={testid}
  role={details ? 'grid' : 'listbox'}
  tabindex="0"
  aria-label={ariaLabel}
  aria-multiselectable={multiSelect}
  aria-activedescendant={activeId ? domId(activeId) : undefined}
  onfocus={() => (focused = true)}
  onblur={() => (focused = false)}
  {onkeydown}
  onclick={(e) => e.target === e.currentTarget && commit([])}
>
  {#if details}
    <div class="inner" style:min-width="{minWidth}px">
      <div class="head" role="row">
        {#each columns as col, i (col.key)}
          <ColumnHeader
            text={col.header}
            width={widthOf(col)}
            align={col.align}
            sortable={col.sortable !== false}
            sortDirection={sortKey === col.key ? sortDirection : 'none'}
            resizable
            divider={i < columns.length - 1}
            onsort={() => sortBy(col.key)}
            onresize={(w) => (widths[col.key] = w)}
          />
        {/each}
      </div>
      {#each shown as row (row.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          id={domId(row.id)}
          class="lvr"
          data-testid={typeof row.testid === 'string' ? row.testid : rowTestid}
          data-row-id={row.id}
        {...rowAttrs(row)}
          {...rowAttrs(row)}
          class:selected={selected.includes(row.id)}
          class:focus={focused && row.id === activeId}
          role="row"
          tabindex="-1"
          aria-selected={selected.includes(row.id)}
          onclick={(e) => pick(shown.indexOf(row), { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey })}
          ondblclick={() => onactivate?.(row)}
          oncontextmenu={(e) => rowMenu(row, e)}
        >
          {#each columns as col, i (col.key)}
            {@const w = widthOf(col)}
            <span class="cell" role="gridcell" style:width={w !== undefined ? `${w}px` : undefined} class:flex={w === undefined} style:justify-content={col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : undefined}>
              {#if i === 0 && row.icon}<Icon name={row.icon} />{/if}
              {#if cell}{@render cell(row, col)}{:else}<span class="t">{cellText(row, col.key)}</span>{/if}
            </span>
          {/each}
        </div>
      {/each}
      {@render empty()}
    </div>
  {:else}
    {#each shown as row (row.id)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        id={domId(row.id)}
        class="item"
        data-testid={typeof row.testid === 'string' ? row.testid : rowTestid}
        data-row-id={row.id}
        {...rowAttrs(row)}
        class:selected={selected.includes(row.id)}
        class:focus={focused && row.id === activeId}
        role="option"
        tabindex="-1"
        aria-selected={selected.includes(row.id)}
        onclick={(e) => pick(shown.indexOf(row), { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey })}
        ondblclick={() => onactivate?.(row)}
        oncontextmenu={(e) => rowMenu(row, e)}
      >
        {#if row.icon}<Icon name={row.icon} size={view === 'LargeIcon' ? 32 : 16} />{/if}
        <span class="t">{cellText(row, textKey)}</span>
      </div>
    {/each}
    {@render empty()}
  {/if}
</div>

<style>
  .w7-listview {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
    outline: none;
  }
  .head {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    border-bottom: 1px solid var(--w7-border-light);
    background: var(--w7-window);
  }
  .lvr,
  .item {
    display: flex;
    align-items: center;
    height: 20px;
    border: 1px solid transparent;
    color: var(--w7-text);
    cursor: default;
  }
  .lvr:hover,
  .item:hover {
    border-color: var(--w7-hot-border);
    background: var(--w7-hot-face);
  }
  .lvr.selected,
  .item.selected {
    border-color: var(--w7-select-border);
    background: var(--w7-select-face);
  }
  .lvr.focus,
  .item.focus {
    outline: var(--w7-focus-outline);
    outline-offset: -2px;
  }
  .cell {
    flex: none;
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 24px;
    padding: 0 6px;
    overflow: hidden;
  }
  .cell.flex {
    flex: 1 1 0;
  }
  .t {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .empty {
    padding: 8px;
    color: var(--w7-text-muted);
  }

  /* View modes other than Details */
  .List {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    align-content: flex-start;
    padding: 2px;
  }
  .List .item {
    width: 160px;
    padding: 0 3px;
    gap: 4px;
  }
  .SmallIcon,
  .LargeIcon {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    padding: 4px;
  }
  .SmallIcon .item {
    width: 150px;
    padding: 0 3px;
    gap: 4px;
  }
  .LargeIcon .item {
    flex-direction: column;
    width: 80px;
    height: auto;
    min-height: 62px;
    padding: 3px 2px;
    gap: 3px;
    text-align: center;
  }
  .LargeIcon .t {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    white-space: normal;
    word-break: break-word;
  }
  .w7-listview:not(.Details) .empty {
    width: 100%;
  }
</style>
