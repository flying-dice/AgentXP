<script lang="ts">
  import {
    MONTH_NAMES, addMonths, buildMonthGrid, clampDate, formatShortDate,
    isSameDay, startOfDay, weekdayHeaders, yearBlockStart
  } from './MonthCalendar'

  type View = 'days' | 'months' | 'years'
  type Props = {
    value?: Date
    min?: Date
    max?: Date
    /** 0 = Sunday, 1 = Monday. */
    firstDayOfWeek?: 0 | 1
    showToday?: boolean
    disabled?: boolean
    onselect?: (date: Date) => void
    class?: string
  }
  let {
    value = $bindable(startOfDay(new Date())),
    min,
    max,
    firstDayOfWeek = 0,
    showToday = true,
    disabled = false,
    onselect,
    class: className = ''
  }: Props = $props()

  const today = startOfDay(new Date())
  let view: View = $state('days')
  let shown = $state(new Date(value.getFullYear(), value.getMonth(), 1))
  let focusDate = $state(value)

  $effect(() => {
    shown = new Date(value.getFullYear(), value.getMonth(), 1)
    focusDate = value
  })

  const grid = $derived(buildMonthGrid(shown.getFullYear(), shown.getMonth(), firstDayOfWeek))
  const heads = $derived(weekdayHeaders(firstDayOfWeek))
  const blockStart = $derived(yearBlockStart(shown.getFullYear()))
  const title = $derived(
    view === 'days'
      ? `${MONTH_NAMES[shown.getMonth()]} ${shown.getFullYear()}`
      : view === 'months'
        ? String(shown.getFullYear())
        : `${blockStart + 1} - ${blockStart + 10}`
  )

  const out = (d: Date) => (!!min && d < min) || (!!max && d > max)

  function pick(d: Date): void {
    if (disabled || out(d)) return
    value = clampDate(d, min, max)
    onselect?.(value)
  }

  function step(dir: 1 | -1): void {
    if (view === 'days') shown = addMonths(shown, dir)
    else if (view === 'months') shown = new Date(shown.getFullYear() + dir, shown.getMonth(), 1)
    else shown = new Date(shown.getFullYear() + dir * 10, shown.getMonth(), 1)
  }

  function zoomOut(): void {
    if (view === 'days') view = 'months'
    else if (view === 'months') view = 'years'
  }

  function zoomIn(kind: 'month' | 'year', n: number): void {
    if (kind === 'year') {
      shown = new Date(n, shown.getMonth(), 1)
      view = 'months'
    } else {
      shown = new Date(shown.getFullYear(), n, 1)
      view = 'days'
    }
  }

  function keydown(e: KeyboardEvent): void {
    if (disabled || view !== 'days') return
    const delta: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    let next: Date | undefined
    if (e.key in delta) {
      next = new Date(focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate() + delta[e.key])
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      next = addMonths(focusDate, e.key === 'PageUp' ? -1 : 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      pick(focusDate)
      e.preventDefault()
      return
    } else return
    e.preventDefault()
    focusDate = next
    shown = new Date(next.getFullYear(), next.getMonth(), 1)
  }
</script>

<div class="xp-cal {className}" class:disabled>
  <div class="head">
    <button type="button" class="nav" aria-label="Previous" {disabled} onclick={() => step(-1)}>
      <svg width="6" height="9"><path d="M6 0 0 4.5 6 9z" fill="currentColor" /></svg>
    </button>
    <button type="button" class="title" disabled={disabled || view === 'years'} onclick={zoomOut}>
      {title}
    </button>
    <button type="button" class="nav" aria-label="Next" {disabled} onclick={() => step(1)}>
      <svg width="6" height="9"><path d="M0 0 6 4.5 0 9z" fill="currentColor" /></svg>
    </button>
  </div>

  {#if view === 'days'}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="body days" role="grid" tabindex="0" aria-label={title} onkeydown={keydown}>
      <div class="row heads" role="row">
        {#each heads as h (h)}<span class="dow" role="columnheader">{h}</span>{/each}
      </div>
      {#each [0, 1, 2, 3, 4, 5] as w (w)}
        <div class="row" role="row">
          {#each grid.slice(w * 7, w * 7 + 7) as cell (cell.date.getTime())}
            <button
              type="button"
              role="gridcell"
              tabindex="-1"
              class="day"
              class:other={!cell.inMonth}
              class:today={isSameDay(cell.date, today)}
              class:selected={isSameDay(cell.date, value)}
              class:focus={isSameDay(cell.date, focusDate)}
              aria-selected={isSameDay(cell.date, value)}
              disabled={disabled || out(cell.date)}
              onclick={() => pick(cell.date)}
            >
              {cell.date.getDate()}
            </button>
          {/each}
        </div>
      {/each}
    </div>
  {:else if view === 'months'}
    <div class="body tiles">
      {#each MONTH_NAMES as m, i (m)}
        <button type="button" class="tile" class:selected={shown.getFullYear() === value.getFullYear() && i === value.getMonth()} onclick={() => zoomIn('month', i)}>
          {m.slice(0, 3)}
        </button>
      {/each}
    </div>
  {:else}
    <div class="body tiles">
      {#each Array.from({ length: 12 }, (_, i) => blockStart + i) as y (y)}
        <button type="button" class="tile" class:other={y < blockStart + 1 || y > blockStart + 10} class:selected={y === value.getFullYear()} onclick={() => zoomIn('year', y)}>
          {y}
        </button>
      {/each}
    </div>
  {/if}

  {#if showToday}
    <button type="button" class="foot" {disabled} onclick={() => { shown = new Date(today.getFullYear(), today.getMonth(), 1); view = 'days'; pick(today) }}>
      <span class="todaybox"></span>Today: {formatShortDate(today)}
    </button>
  {/if}
</div>

<style>
  .xp-cal {
    display: inline-block;
    width: 196px;
    box-sizing: border-box;
    padding: 0;
    background: #fff;
    border: 1px solid var(--xp-list-border);
    font: var(--xp-font);
    color: var(--xp-text);
  }
  .xp-cal.disabled {
    color: var(--xp-text-disabled);
  }
  .head {
    display: flex;
    align-items: center;
    height: 28px;
    padding: 0 3px;
    background: var(--xp-calendar-header);
    border-bottom: 1px solid #d5dfe5;
  }
  .nav,
  .title {
    border: 1px solid transparent;
    background: transparent;
    color: #1e395b;
    height: 22px;
    cursor: default;
  }
  .nav {
    width: 22px;
    display: grid;
    place-items: center;
    padding: 0;
    border-radius: 2px;
  }
  .title {
    flex: 1;
    font-size: 13px;
    border-radius: 2px;
  }
  .nav:hover:not(:disabled),
  .title:hover:not(:disabled) {
    border-color: var(--xp-hot-border);
    background: var(--xp-hot-face);
  }
  .nav:active:not(:disabled) {
    border-color: var(--xp-select-border);
    background: var(--xp-select-face);
  }
  .body {
    padding: 4px 6px;
    outline: none;
  }
  .body:focus-visible {
    outline: var(--xp-focus-outline);
    outline-offset: -3px;
  }
  .row {
    display: flex;
  }
  .dow {
    width: 26px;
    height: 20px;
    line-height: 20px;
    text-align: center;
    color: #1e395b;
    border-bottom: 1px solid #d5dfe5;
  }
  .heads {
    margin-bottom: 2px;
  }
  .day {
    width: 26px;
    height: 20px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    text-align: center;
    color: inherit;
    cursor: default;
  }
  .day.other,
  .tile.other {
    color: #8d8d8d;
  }
  .day:hover:not(:disabled),
  .tile:hover {
    border-color: var(--xp-hot-border);
    background: var(--xp-hot-face);
  }
  .day.today {
    border-color: var(--xp-calendar-today);
    background: linear-gradient(#5b9be0, var(--xp-calendar-today));
    color: #fff;
  }
  .day.selected,
  .tile.selected {
    border-color: var(--xp-select-border);
    background: var(--xp-select-face);
    color: #000;
  }
  .day.today.selected {
    border-color: #1d4f8f;
    background: linear-gradient(#4a8bd6, #2f6fb8);
    color: #fff;
  }
  .day.focus:focus-visible,
  .body:focus-visible .day.focus {
    outline: var(--xp-focus-outline);
    outline-offset: -2px;
  }
  .day:disabled {
    color: var(--xp-text-disabled);
    opacity: 0.6;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
    height: 176px;
    align-content: stretch;
  }
  .tile {
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    cursor: default;
    color: inherit;
  }
  .foot {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    height: 22px;
    padding: 0 8px;
    border: 0;
    border-top: 1px solid #d5dfe5;
    background: transparent;
    cursor: default;
    text-align: left;
  }
  .foot:hover:not(:disabled) {
    background: var(--xp-hot-face);
  }
  .todaybox {
    width: 12px;
    height: 12px;
    border: 1px solid var(--xp-calendar-today);
    border-radius: 2px;
    background: linear-gradient(#5b9be0, var(--xp-calendar-today));
  }
</style>
