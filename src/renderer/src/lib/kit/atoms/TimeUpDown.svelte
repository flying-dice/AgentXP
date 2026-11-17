<script lang="ts">
  import SpinButtons from './SpinButtons.svelte'
  import { clampMinutes, formatTime, parseTime, segmentAt, segmentRange, stepTime, type TimeSegment } from './TimeUpDown'

  interface Props {
    /** Minutes since midnight, 0 ... 1439. */
    value?: number
    disabled?: boolean
    readonly?: boolean
    /** What a step of the minutes adds (1 by default). */
    minuteStep?: number
    class?: string
    style?: string
    /** `data-testid` of the text field. */
    testid?: string
    onchange?: (value: number) => void
    'aria-label'?: string
  }

  let { value = $bindable(0), disabled = false, readonly = false, minuteStep = 1, class: className = '', style, testid, onchange, 'aria-label': ariaLabel = 'Time' }: Props = $props()

  let draft = $state<string | null>(null)
  let input = $state<HTMLInputElement | null>(null)
  let segment = $state<TimeSegment>('hour')
  const text = $derived(draft ?? formatTime(value))

  function set(next: number): void {
    const n = clampMinutes(next)
    draft = null
    if (n === value) return
    value = n
    onchange?.(n)
  }

  /** The typed text counts when it is a time; otherwise the field goes back to the value. */
  function commit(): void {
    if (draft === null) return
    const parsed = parseTime(draft)
    set(parsed ?? value)
    draft = null
  }

  /** Selects the segment that changed, so the next step goes on in it. */
  function select(next: TimeSegment): void {
    segment = next
    queueMicrotask(() => {
      if (!input) return
      const [start, end] = segmentRange(input.value, next)
      input.setSelectionRange(start, end)
    })
  }

  function step(direction: 1 | -1): void {
    if (disabled || readonly) return
    commit()
    set(stepTime(value, segment, direction, minuteStep))
    select(segment)
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      if (input && draft === null) segment = segmentAt(input.value, input.selectionStart ?? 0)
      step(event.key === 'ArrowUp' ? 1 : -1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      commit()
    }
  }

  function trackCaret(): void {
    if (input && draft === null) segment = segmentAt(input.value, input.selectionStart ?? 0)
  }
</script>

<span class="xp-timeupdown {className}" class:disabled {style}>
  <input
    bind:this={input}
    type="text"
    role="spinbutton"
    aria-label={ariaLabel}
    aria-valuetext={formatTime(value)}
    aria-valuenow={value}
    aria-valuemin={0}
    aria-valuemax={1439}
    data-testid={testid}
    {disabled}
    {readonly}
    value={text}
    oninput={(e) => (draft = e.currentTarget.value)}
    onblur={commit}
    onkeydown={onKeydown}
    onclick={trackCaret}
    onkeyup={trackCaret}
  />
  <SpinButtons upDisabled={disabled || readonly} downDisabled={disabled || readonly} onup={() => step(1)} ondown={() => step(-1)} />
</span>

<style>
  .xp-timeupdown {
    display: inline-flex;
    align-items: stretch;
    height: 21px;
    width: 96px;
    box-sizing: border-box;
    border: 1px solid var(--xp-input-border);
    border-top-color: var(--xp-input-border-top);
    background: var(--xp-window);
  }
  .xp-timeupdown:hover:not(.disabled) {
    border-color: #3d7bad;
  }
  .xp-timeupdown:focus-within {
    border-color: #569de5;
  }
  .xp-timeupdown.disabled {
    border-color: var(--xp-border-disabled);
    background: #f4f4f4;
  }
  input {
    flex: 1;
    min-width: 0;
    padding: 0 3px;
    border: 0;
    outline: none;
    background: transparent;
    font: inherit;
    color: var(--xp-text);
    user-select: text;
  }
  input:disabled {
    color: var(--xp-text-disabled);
  }
</style>
