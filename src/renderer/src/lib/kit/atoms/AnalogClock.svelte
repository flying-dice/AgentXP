<script lang="ts">
  interface Props {
    time?: Date
    size?: number
  }

  let { time = new Date(), size = 64 }: Props = $props()

  const h = $derived(((time.getHours() % 12) + time.getMinutes() / 60) * 30)
  const m = $derived((time.getMinutes() + time.getSeconds() / 60) * 6)
</script>

<svg class="xp-analog-clock" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Clock {time.getHours()}:{String(time.getMinutes()).padStart(2, '0')}">
  <circle cx="50" cy="50" r="47" fill="#f7f9fc" stroke="#8a97ab" stroke-width="3" />
  {#each Array.from({ length: 12 }, (_, i) => i) as i (i)}
    <line x1="50" y1="9" x2="50" y2={i % 3 === 0 ? 17 : 13} stroke="#2a3446" stroke-width={i % 3 === 0 ? 3 : 1.5} transform="rotate({i * 30} 50 50)" />
  {/each}
  <line x1="50" y1="50" x2="50" y2="27" stroke="#18202e" stroke-width="4.5" stroke-linecap="round" transform="rotate({h} 50 50)" />
  <line x1="50" y1="50" x2="50" y2="14" stroke="#18202e" stroke-width="3" stroke-linecap="round" transform="rotate({m} 50 50)" />
  <circle cx="50" cy="50" r="3.5" fill="#18202e" />
</svg>

<style>
  .xp-analog-clock {
    display: block;
    flex: none;
  }
</style>
