<script lang="ts">
  type Props = {
    /** `blocks`: three green blocks marching along (the XP progress marquee). `hourglass`: the XP busy hourglass. */
    variant?: 'blocks' | 'hourglass'
    size?: number
    label?: string
    class?: string
  }
  let { variant = 'blocks', size = 14, label = 'Working', class: className = '' }: Props = $props()
</script>

{#if variant === 'blocks'}
  <span role="status" aria-label={label} class="blocks {className}" style="--s:{size}px">
    <i></i><i></i><i></i>
  </span>
{:else}
  <svg role="status" aria-label={label} class="glass {className}" width={size} height={size} viewBox="0 0 16 16">
    <path d="M3 1.5h10M3 14.5h10" stroke="#5a5a5a" stroke-width="1.6" />
    <path d="M4 2l8 0c0 3-2.500 4.500-4 6 -1.500-1.500-4-3-4-6z" fill="#cfe1ff" stroke="#003c74" stroke-linejoin="round" />
    <path d="M4 14l8 0c0-3-2.500-4.500-4-6 -1.500 1.500-4 3-4 6z" fill="#cfe1ff" stroke="#003c74" stroke-linejoin="round" />
    <path d="M5.500 12.800h5L8 10z" fill="#d8a020" />
  </svg>
{/if}

<style>
  .blocks {
    display: inline-flex;
    gap: 1px;
    vertical-align: middle;
    height: calc(var(--s) * 0.6);
    width: calc(var(--s) * 1.6);
    padding: 1px;
    box-sizing: border-box;
    border: 1px solid #686868;
    background: #fff;
    overflow: hidden;
  }
  .blocks i {
    flex: none;
    width: calc(var(--s) * 0.38);
    background: #37c037;
    animation: march 1.2s linear infinite;
  }
  .blocks i:nth-child(2) {
    animation-delay: 0.1s;
  }
  .blocks i:nth-child(3) {
    animation-delay: 0.2s;
  }
  @keyframes march {
    0% {
      transform: translateX(calc(var(--s) * -1.4));
    }
    100% {
      transform: translateX(calc(var(--s) * 1.6));
    }
  }
  .glass {
    display: inline-block;
    vertical-align: middle;
    animation: flip 1.6s steps(1, end) infinite;
  }
  @keyframes flip {
    50% {
      transform: rotate(180deg);
    }
  }
</style>
