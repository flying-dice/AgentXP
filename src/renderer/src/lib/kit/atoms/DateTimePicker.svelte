<script lang="ts">
  import { clickOutside } from '../actions/clickOutside'
  import MonthCalendar from './MonthCalendar.svelte'
  import { formatLongDate, formatShortDate, formatTime } from './MonthCalendar'

  type Props = {
    value?: Date
    format?: 'Long' | 'Short' | 'Time'
    min?: Date
    max?: Date
    disabled?: boolean
    width?: number
    label?: string
    /** `data-testid` of the field; the button that opens the calendar gets `<testid>-open`. */
    testid?: string
    onchange?: (date: Date) => void
    class?: string
  }
  let {
    value = $bindable(new Date()),
    format = 'Long',
    min,
    max,
    disabled = false,
    width = 220,
    label = 'Date',
    testid,
    onchange,
    class: className = ''
  }: Props = $props()

  let open = $state(false)
  const text = $derived(
    format === 'Long' ? formatLongDate(value) : format === 'Short' ? formatShortDate(value) : formatTime(value)
  )

  function select(d: Date): void {
    value = new Date(d.getFullYear(), d.getMonth(), d.getDate(), value.getHours(), value.getMinutes(), value.getSeconds())
    onchange?.(value)
    open = false
  }

  function adjust(e: KeyboardEvent): void {
    if (disabled || format === 'Time') return
    const d = e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : 0
    if (e.key === 'Escape') open = false
    if (e.key === 'F4' || (e.altKey && e.key === 'ArrowDown')) {
      open = !open
      e.preventDefault()
      return
    }
    if (!d) return
    e.preventDefault()
    value = new Date(value.getFullYear(), value.getMonth(), value.getDate() + d, value.getHours(), value.getMinutes(), value.getSeconds())
    onchange?.(value)
  }
</script>

<div class="xp-dtp-wrap" use:clickOutside={{ handler: () => (open = false) }}>
  <div class="xp-dtp {className}" class:disabled class:open style="width:{width}px">
    <span
      class="field"
      role="spinbutton"
      tabindex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuetext={text}
      aria-disabled={disabled}
      data-testid={testid}
      onkeydown={adjust}
    >
      {text}
    </span>
    {#if format !== 'Time'}
      <button
        type="button"
        {disabled}
        tabindex="-1"
        aria-label="Open calendar"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid={testid ? `${testid}-open` : undefined}
        class="drop"
        onclick={() => (open = !open)}
      >
        <svg width="7" height="4" aria-hidden="true"><path d="M0 0h7L3.5 4z" fill="currentColor" /></svg>
      </button>
    {/if}
  </div>
  {#if open}
    <div class="pop" role="dialog" aria-label="Calendar" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && (open = false)}>
      <MonthCalendar {value} {min} {max} onselect={select} />
    </div>
  {/if}
</div>

<style>
  .xp-dtp {
    display: inline-flex;
    align-items: stretch;
    box-sizing: border-box;
    height: 21px;
    background: #fff;
    border: 1px solid var(--xp-input-border);
    border-top-color: var(--xp-input-border-top);
    font: var(--xp-font);
  }
  .xp-dtp:hover:not(.disabled),
  .xp-dtp.open {
    border-color: #003c74;
  }
  .xp-dtp.disabled {
    background: var(--xp-face);
    color: var(--xp-text-disabled);
    border-color: var(--xp-border-disabled);
  }
  .field {
    flex: 1;
    min-width: 0;
    padding: 0 4px;
    line-height: 19px;
    white-space: nowrap;
    overflow: hidden;
    outline: none;
  }
  .field:focus-visible {
    background: var(--xp-list-select-face);
    color: #fff;
  }
  .drop {
    flex: none;
    width: 17px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-left: 1px solid #b5c2d6;
    background: linear-gradient(#f6f9fd, #dbe6f4 50%, #cfdcee 51%, #dfe9f6);
    color: #3c4a60;
  }
  .drop:hover:not(:disabled) {
    background: var(--xp-btn-hover-face);
  }
  .drop:disabled {
    background: #f4f2e8;
    color: #999;
  }
  .pop {
    position: absolute;
    left: 0;
    top: 100%;
    z-index: 50;
    box-shadow: var(--xp-shadow-popup);
  }
  .xp-dtp-wrap {
    position: relative;
    display: inline-block;
  }
</style>
