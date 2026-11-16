<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity'
  import type { Snippet } from 'svelte'
  import { provideRadioGroup } from './radioContext'

  interface Props {
    value?: string
    orientation?: 'vertical' | 'horizontal'
    disabled?: boolean
    class?: string
    onchange?: (value: string) => void
    children?: Snippet
    'aria-label'?: string
  }

  let {
    value = $bindable(''),
    orientation = 'vertical',
    disabled = false,
    class: className = '',
    onchange,
    children,
    'aria-label': ariaLabel
  }: Props = $props()

  const registered = new SvelteSet<string>()
  let root: HTMLDivElement

  provideRadioGroup({
    get value() {
      return value
    },
    get disabled() {
      return disabled
    },
    get hasSelection() {
      return registered.has(value)
    },
    select(next) {
      if (next === value) return
      value = next
      onchange?.(next)
    },
    register(v) {
      registered.add(v)
      return () => registered.delete(v)
    }
  })

  function onKeydown(event: KeyboardEvent): void {
    const forward = orientation === 'vertical' ? ['ArrowDown', 'ArrowRight'] : ['ArrowRight', 'ArrowDown']
    const backward = ['ArrowUp', 'ArrowLeft']
    const step = forward.includes(event.key) ? 1 : backward.includes(event.key) ? -1 : 0
    if (!step) return
    const radios = [...root.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)')]
    if (!radios.length) return
    event.preventDefault()
    const at = radios.indexOf(document.activeElement as HTMLButtonElement)
    const target = radios[(at + step + radios.length) % radios.length]
    target.focus()
    target.click()
  }
</script>

<!-- svelte-ignore a11y_interactive_supports_focus -->
<div
  bind:this={root}
  class="w7-radio-group {orientation} {className}"
  role="radiogroup"
  aria-label={ariaLabel}
  aria-orientation={orientation}
  aria-disabled={disabled || undefined}
  onkeydown={onKeydown}
>
  {@render children?.()}
</div>

<style>
  .w7-radio-group {
    display: flex;
    gap: 6px;
  }
  .vertical {
    flex-direction: column;
    align-items: flex-start;
  }
  .horizontal {
    flex-direction: row;
    align-items: center;
    gap: 14px;
  }
</style>
