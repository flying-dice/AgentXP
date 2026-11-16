<script lang="ts">
  type T = string | number
  import ListBox from './ListBox.svelte'
  import type { ListBoxItem } from './ListBox'

  type Props = {
    items: ListBoxItem<T>[]
    /** Values of the checked items. */
    checked?: T[]
    /** Highlighted (selected) value; independent of checked state. */
    value?: T | undefined
    disabled?: boolean
    width?: number | string
    height?: number | string
    label?: string
    onitemcheck?: (value: T, checked: boolean) => void
    class?: string
  }

  let {
    items,
    checked = $bindable([]),
    value = $bindable(undefined),
    disabled = false,
    width = 180,
    height = 120,
    label = 'Checked list',
    onitemcheck,
    class: className = ''
  }: Props = $props()

  function toggle(item: ListBoxItem<T>): void {
    if (disabled || item.disabled) return
    const on = !checked.includes(item.value)
    checked = on ? [...checked, item.value] : checked.filter((v) => v !== item.value)
    onitemcheck?.(item.value, on)
  }
</script>

<ListBox
  {items}
  bind:value
  {disabled}
  {width}
  {height}
  {label}
  class={className}
  onitemactivate={toggle}
>
  {#snippet prefix(item)}
    <span
      class="box"
      class:on={checked.includes(item.value)}
      class:off={disabled || item.disabled}
      role="checkbox"
      aria-checked={checked.includes(item.value)}
      aria-label={item.label}
      tabindex="-1"
      onpointerdown={(e) => { e.stopPropagation(); toggle(item) }}
    ></span>
  {/snippet}
</ListBox>

<style>
  .box {
    flex: none;
    position: relative;
    width: 13px;
    height: 13px;
    box-sizing: border-box;
    border: 1px solid #8e8f8f;
    border-radius: 2px;
    background: linear-gradient(135deg, #dcdcdc, #fff 60%);
  }
  .box:hover:not(.off) {
    border-color: #3c7fb1;
    background: linear-gradient(135deg, #d9f0fc, #fff 60%);
  }
  .box.off {
    border-color: var(--xp-border-disabled);
    background: #f4f4f4;
  }
  .box.on::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 0;
    width: 3px;
    height: 7px;
    border: solid #1e395b;
    border-width: 0 2px 2px 0;
    transform: rotate(40deg);
  }
  .box.on.off::after {
    border-color: #848484;
  }
</style>
