<script lang="ts">
  import SpinButtons from './SpinButtons.svelte'

  interface Props {
    items: string[]
    value?: string
    /** Wrap around at the ends (Wrap). */
    wrap?: boolean
    disabled?: boolean
    class?: string
    style?: string
    onchange?: (value: string) => void
    'aria-label'?: string
  }

  let {
    items,
    value = $bindable(''),
    wrap = false,
    disabled = false,
    class: className = '',
    style,
    onchange,
    'aria-label': ariaLabel
  }: Props = $props()

  const index = $derived(items.indexOf(value))

  function select(i: number): void {
    if (!items.length) return
    const n = wrap ? (i + items.length) % items.length : Math.min(items.length - 1, Math.max(0, i))
    if (items[n] === value) return
    value = items[n]
    onchange?.(value)
  }

  function spin(direction: 1 | -1): void {
    if (disabled) return
    select(index < 0 ? (direction === 1 ? 0 : items.length - 1) : index + direction)
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp') spin(1)
    else if (event.key === 'ArrowDown') spin(-1)
    else if (event.key === 'Home') select(0)
    else if (event.key === 'End') select(items.length - 1)
    else if (event.key.length === 1 && !event.ctrlKey && !event.altKey) {
      const key = event.key.toLowerCase()
      const from = Math.max(index, -1)
      const order = [...items.keys()].map((_, k) => (from + 1 + k) % items.length)
      const hit = order.find((i) => items[i].toLowerCase().startsWith(key))
      if (hit !== undefined) select(hit)
    } else return
    event.preventDefault()
  }
</script>

<span class="w7-updown {className}" class:disabled {style}>
  <input
    type="text"
    role="spinbutton"
    readonly
    aria-label={ariaLabel}
    aria-valuetext={value}
    aria-valuenow={index}
    aria-valuemin={0}
    aria-valuemax={items.length - 1}
    {disabled}
    {value}
    onkeydown={onKeydown}
  />
  <SpinButtons
    upDisabled={disabled || (!wrap && index >= items.length - 1)}
    downDisabled={disabled || (!wrap && index <= 0)}
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
    cursor: default;
  }
  input:focus {
    background: #3399ff;
    color: #fff;
  }
  input:disabled {
    color: var(--w7-text-disabled);
  }
</style>
