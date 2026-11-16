<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    /** Tooltip text; use `content` for rich content. */
    text?: string
    content?: Snippet
    /** Element the tooltip belongs to. */
    trigger?: Snippet<[{ describedBy: string }]>
    children?: Snippet
    /** InitialDelay in ms. */
    delay?: number
    disabled?: boolean
    class?: string
  }

  let {
    text,
    content,
    trigger,
    children,
    delay = 500,
    disabled = false,
    class: className = ''
  }: Props = $props()

  const uid = $props.id()
  let anchor = $state<HTMLElement | null>(null)
  let tip = $state<HTMLElement | null>(null)
  let visible = $state(false)
  let at = $state({ x: 0, y: 0 })
  let timer: ReturnType<typeof setTimeout> | undefined

  function schedule(x: number, y: number): void {
    clearTimeout(timer)
    if (disabled) return
    at = { x, y }
    timer = setTimeout(() => (visible = true), delay)
  }

  function hide(): void {
    clearTimeout(timer)
    visible = false
  }

  function onEnter(event: PointerEvent): void {
    schedule(event.clientX, event.clientY + 20)
  }

  function onFocus(): void {
    const r = anchor?.getBoundingClientRect()
    if (r) schedule(r.left, r.bottom + 2)
  }

  /** Keep the tip inside the viewport once it has been measured. */
  const placed = $derived.by(() => {
    if (!visible || !tip) return at
    const w = tip.offsetWidth
    const h = tip.offsetHeight
    return {
      x: Math.max(0, Math.min(at.x, window.innerWidth - w - 2)),
      y: at.y + h > window.innerHeight ? Math.max(0, at.y - h - 28) : at.y
    }
  })
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && hide()} />

<span
  bind:this={anchor}
  class="xp-tooltip-anchor {className}"
  role="presentation"
  onpointerenter={onEnter}
  onpointermove={(e) => !visible && schedule(e.clientX, e.clientY + 20)}
  onpointerleave={hide}
  onpointerdown={hide}
  onfocusin={onFocus}
  onfocusout={hide}
>
  {#if trigger}{@render trigger({ describedBy: `${uid}-tip` })}{:else}{@render children?.()}{/if}
</span>

{#if visible}
  <div
    bind:this={tip}
    id="{uid}-tip"
    class="xp-tooltip"
    role="tooltip"
    style:left="{placed.x}px"
    style:top="{placed.y}px"
  >
    {#if content}{@render content()}{:else}{text}{/if}
  </div>
{/if}

<style>
  .xp-tooltip-anchor {
    display: inline-flex;
  }
  .xp-tooltip {
    position: fixed;
    z-index: 2000;
    max-width: 300px;
    padding: 3px 5px 4px;
    border: 1px solid #767676;
    border-radius: 2px;
    background: linear-gradient(#fff, #e4e5f0);
    box-shadow: 2px 2px 3px rgba(0, 0, 0, 0.25);
    color: #575757;
    font: var(--xp-font);
    pointer-events: none;
    white-space: pre-wrap;
  }
</style>
