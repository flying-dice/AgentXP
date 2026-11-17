<script lang="ts">
  interface Props {
    /** 0..1 */
    value?: number
    size?: number
    label?: string
    /** Value at or above this turns the red zone on (0..1). */
    danger?: number
  }

  let { value = 0, size = 92, label, danger = 0.8 }: Props = $props()

  const v = $derived(Math.max(0, Math.min(1, value)))
  // Dial sweeps from 225 degrees (bottom-left) through the top to -45 (bottom-right): 270 degrees.
  const angle = $derived(-135 + v * 270)
  const xy = (a: number, r: number): { x: string; y: string } => {
    const rad = ((a - 90) * Math.PI) / 180
    return { x: (50 + r * Math.cos(rad)).toFixed(2), y: (50 + r * Math.sin(rad)).toFixed(2) }
  }
  const point = (a: number, r: number): string => `${xy(a, r).x},${xy(a, r).y}`
  const arc = (from: number, to: number, r: number): string => `M${point(from, r)} A${r},${r} 0 ${to - from > 180 ? 1 : 0} 1 ${point(to, r)}`
</script>

<svg class="xp-gauge" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="{label ?? 'Gauge'}: {Math.round(v * 100)}%">
  <defs>
    <radialGradient id="gauge-face" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="#3d4a5c" /><stop offset="1" stop-color="#10161f" /></radialGradient>
  </defs>
  <circle cx="50" cy="50" r="47" fill="url(#gauge-face)" stroke="#aeb9c9" stroke-width="3" />
  <circle cx="50" cy="50" r="47" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1" />
  <path d={arc(-135, 135, 36)} fill="none" stroke="#6c7a8e" stroke-width="2" />
  <path d={arc(-135 + danger * 270, 135, 36)} fill="none" stroke="#e0392b" stroke-width="4" />
  {#each [0, 0.25, 0.5, 0.75, 1] as t (t)}
    {@const a = -135 + t * 270}
    <line x1={xy(a, 30).x} y1={xy(a, 30).y} x2={xy(a, 40).x} y2={xy(a, 40).y} stroke="#d7e0ee" stroke-width="1.5" />
  {/each}
  <line x1="50" y1="50" x2={xy(angle, 32).x} y2={xy(angle, 32).y} stroke="#ff9a4a" stroke-width="2" stroke-linecap="round" />
  <circle cx="50" cy="50" r="4" fill="#e8eef8" />
</svg>

<style>
  .xp-gauge {
    display: block;
    flex: none;
  }
</style>
