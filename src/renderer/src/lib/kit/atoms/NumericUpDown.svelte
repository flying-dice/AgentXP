<script lang="ts">
  import SpinButtons from './SpinButtons.svelte'

  interface Props {
    value?: number
    min?: number
    max?: number
    step?: number
    decimalPlaces?: number
    disabled?: boolean
    readonly?: boolean
    class?: string
    style?: string
    onchange?: (value: number) => void
    'aria-label'?: string
  }

  let {
    value = $bindable(0),
    min = 0,
    max = 100,
    step = 1,
    decimalPlaces = 0,
    disabled = false,
    readonly = false,
    class: className = '',
    style,
    onchange,
    'aria-label': ariaLabel
  }: Props = $props()

  let draft = $state<string | null>(null)
  const text = $derived(draft ?? value.toFixed(decimalPlaces))

  const normalize = (n: number): number =>
    Number(Math.min(max, Math.max(min, n)).toFixed(decimalPlaces))

  function set(next: number): void {
    const n = normalize(next)
    draft = null
    if (n === value) return
    value = n
    onchange?.(n)
  }

  function commit(): void {
    if (draft === null) return
    const parsed = Number.parseFloat(draft.replace(',', '.'))
    set(Number.isFinite(parsed) ? parsed : value)
    draft = null
  }

  function spin(direction: 1 | -1, multiplier = 1): void {
    if (disabled || readonly) return
    draft = null
    set(value + direction * step * multiplier)
  }

  function onKeydown(event: KeyboardEvent): void {
    const keys: Record<string, () => void> = {
      ArrowUp: () => spin(1),
      ArrowDown: () => spin(-1),
      PageUp: () => spin(1, 10),
      PageDown: () => spin(-1, 10),
      Enter: commit
    }
    const action = keys[event.key]
    if (!action) return
    event.preventDefault()
    action()
  }
</script>

<span class="w7-updown {className}" class:disabled {style}>
  <input
    type="text"
    role="spinbutton"
    inputmode="decimal"
    aria-label={ariaLabel}
    aria-valuenow={value}
    aria-valuemin={min}
    aria-valuemax={max}
    {disabled}
    {readonly}
    value={text}
    oninput={(e) => (draft = e.currentTarget.value)}
    onblur={commit}
    onkeydown={onKeydown}
  />
  <SpinButtons
    upDisabled={disabled || readonly || value >= max}
    downDisabled={disabled || readonly || value <= min}
    onup={() => spin(1)}
    ondown={() => spin(-1)}
  />
</span>

<style>
  .w7-updown {
    display: inline-flex;
    align-items: stretch;
    height: 21px;
    width: 120px;
    border: 1px solid var(--w7-input-border);
    border-top-color: var(--w7-input-border-top);
    background: var(--w7-window);
  }
  .w7-updown:hover:not(.disabled) {
    border-color: #3d7bad;
  }
  .w7-updown:focus-within {
    border-color: #569de5;
  }
  .w7-updown.disabled {
    border-color: var(--w7-border-disabled);
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
    color: var(--w7-text);
    user-select: text;
  }
  input:disabled {
    color: var(--w7-text-disabled);
  }
</style>
