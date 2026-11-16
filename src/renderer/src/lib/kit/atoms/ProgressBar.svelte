<script lang="ts">
  type Props = {
    value?: number
    min?: number
    max?: number
    style?: 'Continuous' | 'Blocks' | 'Marquee'
    state?: 'normal' | 'paused' | 'error'
    width?: number | string
    label?: string
    class?: string
  }
  let {
    value = 0,
    min = 0,
    max = 100,
    style = 'Continuous',
    state = 'normal',
    width = 200,
    label = 'Progress',
    class: className = ''
  }: Props = $props()

  const marquee = $derived(style === 'Marquee')
  const pct = $derived(max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0)
  const dim = $derived(typeof width === 'number' ? `${width}px` : width)
</script>

<div
  role="progressbar"
  aria-label={label}
  aria-valuemin={min}
  aria-valuemax={max}
  aria-valuenow={marquee ? undefined : value}
  class="w7-progress {state} {className}"
  style="width:{dim}"
>
  {#if marquee}
    <div class="fill marq"></div>
  {:else}
    <div class="fill" class:blocks={style === 'Blocks'} style="width:{pct}%"></div>
  {/if}
</div>

<style>
  :global(.w7-progress) {
    --fill: var(--w7-progress-fill);
    position: relative;
    display: block;
    height: 15px;
    box-sizing: border-box;
    overflow: hidden;
    border: 1px solid var(--w7-progress-border);
    border-radius: 2px;
    background: linear-gradient(#e0e0e0, var(--w7-progress-track) 30%, #f1f1f1);
    box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.12);
  }
  :global(.w7-progress.paused) {
    --fill: var(--w7-progress-fill-paused);
  }
  :global(.w7-progress.error) {
    --fill: var(--w7-progress-fill-error);
  }
  .fill {
    position: relative;
    height: 100%;
    background: var(--fill);
    border-right: 1px solid rgba(0, 80, 0, 0.35);
    box-sizing: border-box;
    overflow: hidden;
  }
  :global(.w7-progress.paused) .fill {
    border-right-color: rgba(120, 90, 0, 0.35);
  }
  :global(.w7-progress.error) .fill {
    border-right-color: rgba(120, 0, 0, 0.35);
  }
  /* Moving Aero glow. */
  .fill::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: -60px;
    width: 60px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55) 60%, transparent);
    animation: glow 2s linear infinite;
  }
  :global(.w7-progress.paused) .fill::after,
  :global(.w7-progress.error) .fill::after {
    animation: none;
    display: none;
  }
  .fill.blocks {
    -webkit-mask: repeating-linear-gradient(90deg, #000 0 8px, transparent 8px 10px);
    mask: repeating-linear-gradient(90deg, #000 0 8px, transparent 8px 10px);
    border-right: 0;
    margin: 0 1px;
  }
  .fill.marq {
    position: absolute;
    top: 0;
    width: 35%;
    animation: marq 1.6s linear infinite;
  }
  .fill.marq::after {
    animation-duration: 1.2s;
  }
  @keyframes glow {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(520px);
    }
  }
  @keyframes marq {
    0% {
      left: -35%;
    }
    100% {
      left: 100%;
    }
  }
</style>
