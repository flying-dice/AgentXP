<script lang="ts">
  import { tick } from 'svelte'
  import CheckBox from '../atoms/CheckBox.svelte'
  import ComboBox from '../atoms/ComboBox.svelte'
  import TextBox from '../atoms/TextBox.svelte'
  import ColumnHeader from '../molecules/ColumnHeader.svelte'
  import {
    DEFAULT_COLUMN_WIDTH,
    clampCell,
    comboItems,
    displayValue,
    parseCellInput,
    type CellRef,
    type GridColumn,
    type GridRow
  } from './DataGridView'

  interface Props {
    columns: GridColumn[]
    rows: GridRow[]
    /** Show the row header column with the current-row arrow. */
    rowHeaders?: boolean
    readOnly?: boolean
    oncellchange?: (cell: CellRef, value: unknown) => void
    onselect?: (cell: CellRef) => void
    class?: string
    'aria-label'?: string
    /** `data-testid` of the grid. */
    testid?: string
    /** `data-testid` of the data rows. */
    rowTestid?: string
  }

  let {
    columns,
    rows = $bindable(),
    rowHeaders = true,
    readOnly = false,
    oncellchange,
    onselect,
    class: className = '',
    'aria-label': ariaLabel = 'Data grid',
    testid,
    rowTestid
  }: Props = $props()

  const uid = $props.id()
  let root = $state<HTMLElement | null>(null)
  let widths = $state<Record<string, number>>({})
  let current = $state<CellRef>({ row: 0, col: 0 })
  let editing = $state(false)
  let draft = $state('')
  let invalid = $state(false)

  const ROW_HEADER = 21
  const widthOf = (c: GridColumn): number => widths[c.key] ?? c.width ?? DEFAULT_COLUMN_WIDTH
  const totalWidth = $derived(columns.reduce((s, c) => s + widthOf(c), 0) + (rowHeaders ? ROW_HEADER : 0))
  const cellId = (r: number, c: number): string => `${uid}-r${r}c${c}`
  const typeOf = (c: GridColumn): string => c.type ?? 'text'
  const editable = (c: GridColumn): boolean => !readOnly && !c.readOnly && typeOf(c) !== 'checkbox'
  const column = $derived(columns[current.col])

  function moveTo(next: CellRef): void {
    const cell = clampCell(next, rows.length, columns.length)
    if (cell.row === current.row && cell.col === current.col) return
    current = cell
    onselect?.(cell)
    tick().then(() => root?.querySelector(`#${CSS.escape(cellId(cell.row, cell.col))}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }))
  }

  function write(cell: CellRef, value: unknown): void {
    const key = columns[cell.col].key
    rows = rows.map((row, i) => (i === cell.row ? { ...row, [key]: value } : row))
    oncellchange?.(cell, value)
  }

  async function beginEdit(initial?: string): Promise<void> {
    if (!column || !editable(column) || rows.length === 0) return
    const value = rows[current.row]?.[column.key]
    draft = initial ?? (value === null || value === undefined ? '' : String(value))
    invalid = false
    editing = true
    await tick()
    const el = root?.querySelector<HTMLInputElement>('.editor input, .editor [role="combobox"]')
    el?.focus()
    if (el instanceof HTMLInputElement) {
      if (initial === undefined) el.select()
      else el.setSelectionRange(el.value.length, el.value.length)
    }
  }

  function endEdit(): void {
    editing = false
    invalid = false
    root?.focus()
  }

  function commit(): boolean {
    if (!editing || !column) return true
    const value = parseCellInput(column, draft)
    if (value === undefined) {
      invalid = true
      return false
    }
    write(current, value)
    endEdit()
    return true
  }

  function commitCombo(value: string): void {
    write(current, value)
    endEdit()
  }

  function toggleCheck(r: number, c: number, checked: boolean): void {
    write({ row: r, col: c }, checked)
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.metaKey) return
    const last = { row: rows.length - 1, col: columns.length - 1 }
    if (editing) {
      if (event.key === 'Escape') endEdit()
      else if (event.key === 'Enter') {
        if (commit()) moveTo({ row: current.row + 1, col: current.col })
      } else if (event.key === 'Tab') {
        if (!commit()) return event.preventDefault()
        moveTo({ row: current.row, col: current.col + (event.shiftKey ? -1 : 1) })
      } else return
      return event.preventDefault()
    }
    const ctrl = event.ctrlKey
    switch (event.key) {
      case 'ArrowDown':
        moveTo({ ...current, row: current.row + 1 })
        break
      case 'ArrowUp':
        moveTo({ ...current, row: current.row - 1 })
        break
      case 'ArrowRight':
        moveTo({ ...current, col: current.col + 1 })
        break
      case 'ArrowLeft':
        moveTo({ ...current, col: current.col - 1 })
        break
      case 'PageDown':
        moveTo({ ...current, row: current.row + 10 })
        break
      case 'PageUp':
        moveTo({ ...current, row: current.row - 10 })
        break
      case 'Home':
        moveTo({ row: ctrl ? 0 : current.row, col: 0 })
        break
      case 'End':
        moveTo({ row: ctrl ? last.row : current.row, col: last.col })
        break
      case 'Tab': {
        const atEdge = event.shiftKey ? current.row === 0 && current.col === 0 : current.row === last.row && current.col === last.col
        if (atEdge) return
        const flat = current.row * columns.length + current.col + (event.shiftKey ? -1 : 1)
        moveTo({ row: Math.floor(flat / columns.length), col: flat % columns.length })
        break
      }
      case 'Enter':
        moveTo({ ...current, row: current.row + 1 })
        break
      case 'F2':
        void beginEdit()
        break
      case ' ':
        if (column && typeOf(column) === 'checkbox' && !readOnly && !column.readOnly) toggleCheck(current.row, current.col, !rows[current.row]?.[column.key])
        else if (column && typeOf(column) === 'combo') void beginEdit()
        else return
        break
      default:
        if (event.key.length !== 1 || ctrl || !column || !editable(column)) return
        if (typeOf(column) === 'number' && !/[0-9.\-]/.test(event.key)) return
        if (typeOf(column) === 'combo') return
        void beginEdit(event.key)
    }
    event.preventDefault()
  }

  function onEditorFocusout(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null
    if (next && (event.currentTarget as HTMLElement).contains(next)) return
    if (editing && !commit()) endEdit()
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<div
  bind:this={root}
  class="xp-grid xp-scroll {className}"
  data-testid={testid}
  role="grid"
  tabindex="0"
  aria-label={ariaLabel}
  aria-rowcount={rows.length + 1}
  aria-colcount={columns.length}
  aria-readonly={readOnly || undefined}
  aria-activedescendant={rows.length ? cellId(current.row, current.col) : undefined}
  {onkeydown}
>
  <div class="inner" style:min-width="{totalWidth}px">
    <div class="head" role="row">
      {#if rowHeaders}<span class="corner" style:width="{ROW_HEADER}px"></span>{/if}
      {#each columns as col (col.key)}
        <ColumnHeader
          text={col.header}
          width={widthOf(col)}
          align={typeOf(col) === 'number' ? 'right' : 'left'}
          resizable
          onresize={(w) => (widths[col.key] = w)}
        />
      {/each}
    </div>
    {#each rows as row, r (r)}
      <div class="row" role="row" aria-rowindex={r + 2} data-testid={rowTestid}>
        {#if rowHeaders}
          <span class="rh" class:cur={r === current.row} role="rowheader" style:width="{ROW_HEADER}px">
            {#if r === current.row}
              <svg width="6" height="9" viewBox="0 0 6 9" aria-hidden="true"><path d="M0 0L6 4.5L0 9z" fill="#000" /></svg>
            {/if}
          </span>
        {/if}
        {#each columns as col, c (col.key)}
          {@const isCur = r === current.row && c === current.col}
          {@const type = typeOf(col)}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div
            id={cellId(r, c)}
            class="cell"
            class:sel={isCur && !editing}
            class:ro={readOnly || col.readOnly}
            class:right={type === 'number'}
            role="gridcell"
            tabindex="-1"
            aria-selected={isCur}
            aria-readonly={readOnly || col.readOnly || undefined}
            style:width="{widthOf(col)}px"
            onclick={() => {
              if (editing && !isCur && !commit()) return
              moveTo({ row: r, col: c })
            }}
            ondblclick={() => {
              moveTo({ row: r, col: c })
              void beginEdit()
            }}
          >
            {#if editing && isCur}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="editor" class:invalid onfocusout={onEditorFocusout}>
                {#if type === 'combo'}
                  <ComboBox items={comboItems(col.options)} value={draft} aria-label={col.header} onchange={commitCombo} />
                {:else}
                  <TextBox bind:value={draft} aria-label={col.header} aria-invalid={invalid || undefined} />
                {/if}
              </div>
            {:else if type === 'checkbox'}
              <CheckBox checked={!!row[col.key]} disabled={readOnly || col.readOnly} onchange={(v) => toggleCheck(r, c, v)} />
            {:else}
              <span class="t">{displayValue(col, row[col.key])}</span>
            {/if}
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .xp-grid {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    background: #ababab;
    border: 1px solid var(--xp-list-border);
    outline: none;
  }
  .inner {
    display: inline-block;
    min-width: 100%;
    background: #ababab;
  }
  .head {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    height: 22px;
    border-bottom: 1px solid #a0a0a0;
    background: linear-gradient(#fff, #f1f1f1 90%, #ece9d8);
  }
  .head :global(.lvh) {
    height: 21px;
    border-right-color: #a0a0a0;
  }
  .corner,
  .rh {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    border-right: 1px solid #a0a0a0;
    background: linear-gradient(90deg, #fff, #ececec);
  }
  .row {
    display: flex;
    height: 22px;
    border-bottom: 1px solid #a0a0a0;
    background: var(--xp-window);
  }
  .rh {
    border-bottom: 0;
  }
  .rh.cur {
    background: linear-gradient(90deg, #f3f8fe, #d3e3f6);
  }
  .cell {
    flex: none;
    display: flex;
    align-items: center;
    padding: 0 3px;
    border-right: 1px solid #a0a0a0;
    background: var(--xp-window);
    overflow: hidden;
    position: relative;
  }
  .cell.right {
    justify-content: flex-end;
  }
  .cell.sel {
    background: var(--xp-list-select-face);
    color: var(--xp-list-select-text);
  }
  .cell.ro:not(.sel) {
    color: var(--xp-text-muted);
  }
  .cell :global(.xp-check) {
    margin: 0 auto;
  }
  .t {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .editor {
    position: absolute;
    inset: 0;
    display: flex;
  }
  .editor :global(.xp-textbox),
  .editor :global(.xp-combo) {
    flex: 1;
    width: 100%;
    height: 100%;
    min-width: 0;
  }
  .editor :global(.xp-textbox) {
    padding: 0 3px;
    border-width: 1px;
  }
  .editor.invalid :global(.xp-textbox) {
    border-color: #d33;
    background: #fff4f4;
  }
</style>
