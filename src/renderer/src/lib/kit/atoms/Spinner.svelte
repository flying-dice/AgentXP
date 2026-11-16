<script lang="ts">
  type Props = {
    variant?: 'ring' | 'aero'
    size?: number
    label?: string
    class?: string
  }
  let { variant = 'ring', size = 14, label = 'Working', class: className = '' }: Props = $props()
  const dots = Array.from({ length: 8 }, (_, i) => i)
</script>

{#if variant === 'ring'}
  <span
    role="status"
    aria-label={label}
    class="ring {className}"
    style="width:{size}px;height:{size}px"
  ></span>
{:else}
  <svg
    role="status"
    aria-label={label}
    class="aero {className}"
    width={size}
    height={size}
    viewBox="-16 -16 32 32"
  >
    {#each dots as i (i)}
      <circle
        r={3 + (i / 7) * 1.5}
        cx="0"
        cy="-11"
        transform="rotate({i * 45})"
        style="animation-delay:{-0.96 + i * 0.12}s"
      />
    {/each}
  </svg>
{/if}

<style>
  .ring {
    display: inline-block;
    border-radius: 50%;
    border: 2px solid #b9d3ee;
    border-top-color: #2a6ebb;
    box-sizing: border-box;
    animation: spin 0.8s linear infinite;
  }
  .aero {
    display: inline-block;
    vertical-align: middle;
  }
  .aero circle {
    fill: #2f7fd8;
    stroke: #fff;
    stroke-width: 0.8;
    opacity: 0.25;
    animation: aero 0.96s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes aero {
    0% {
      opacity: 1;
      fill: #8fd0ff;
    }
    100% {
      opacity: 0.2;
      fill: #2f7fd8;
    }
  }
</style>
