<script module lang="ts">
  export type AgentCursorState = 'ready' | 'gliding' | 'arrived' | 'idle' | 'cancelled' | 'hidden'
</script>

<script lang="ts">
  /**
   * The agent cursor (`docs/AGENT_PRESENCE.md`, section 8): the Windows XP arrow in the agent's colour with a name tag,
   * so the operator knows which agent is pointing ("an agent is doing this for you to watch"). The name is always shown
   * next to the colour, never colour alone.
   *
   * It sits at `x`, `y` (the tip of the arrow) inside a positioned parent. Moving it glides there in `glideMs`,
   * ease-out: the one documented motion exception of the XP look (`XP_DESIGN_LANGUAGE.md`, "Motion"). With
   * `reducedMotion` it jumps and shows a short pulse ring instead. `state` is exposed as `data-state` for tests:
   * `ready` (placed at the start of a glide), `gliding`, `arrived`, `idle` (faded out after a while), `cancelled` (the operator took over) or `hidden`.
   */

  interface Props {
    name: string
    /** A CSS colour (the agent's identity colour). */
    color: string
    x: number
    y: number
    state?: AgentCursorState
    /** Jump instead of glide, with a pulse ring on arrival (`prefers-reduced-motion`). */
    reducedMotion?: boolean
    glideMs?: number
    /** `true` when the arrow points at something the operator is shown (a pulse ring when it arrives with reduced motion). */
    pulse?: boolean
    testid?: string
  }

  let { name, color, x, y, state = 'arrived', reducedMotion = false, glideMs = 300, pulse = true, testid = 'agent-cursor' }: Props = $props()

  const moving = $derived(state === 'gliding' && !reducedMotion)
  /** The arrow, its tip at 0,0 (the point the cursor stands for). */
  const ARROW = 'M0 0 L0 15.5 L3.8 11.9 L6.4 17.8 L8.8 16.8 L6.3 11 L11.2 11 Z'
</script>

<div
  class="cursor"
  class:faded={state === 'idle' || state === 'cancelled'}
  class:hidden={state === 'hidden'}
  data-testid={testid}
  data-agent={name}
  data-state={state}
  data-motion={reducedMotion ? 'reduced' : 'glide'}
  aria-hidden="true"
  style:left="{x}px"
  style:top="{y}px"
  style:--glide="{moving ? glideMs : 0}ms"
  style:--agent={color}
>
  {#if reducedMotion && pulse && state === 'arrived'}<span class="pulse" data-testid="agent-cursor-pulse"></span>{/if}
  <svg class="arrow" viewBox="-1.5 -1.5 15 22" width="17" height="25">
    <!-- The XP arrow: a black outline, a white edge inside it, the agent's colour as the fill. -->
    <path d={ARROW} fill="none" stroke="var(--xp-cursor-outline)" stroke-width="2.6" stroke-linejoin="round" />
    <path d={ARROW} fill="var(--agent)" stroke="var(--xp-cursor-edge)" stroke-width="1.1" stroke-linejoin="round" />
  </svg>
  <span class="tag" data-testid="agent-cursor-name" style:border-left-color={color}>{name}</span>
</div>

<style>
  .cursor {
    position: absolute;
    display: flex;
    align-items: flex-start;
    pointer-events: none;
    transition:
      left var(--glide) ease-out,
      top var(--glide) ease-out,
      opacity 0.4s linear;
    filter: drop-shadow(var(--xp-cursor-shadow));
  }
  .faded {
    opacity: 0;
  }
  .hidden {
    display: none;
  }
  .arrow {
    flex: none;
    display: block;
    margin: -2px 0 0 -2px; /* the tip of the arrow is the point x, y */
  }
  .tag {
    margin: 16px 0 0 -3px;
    padding: 0 4px 1px 3px;
    border: 1px solid var(--xp-cursor-tag-border);
    border-left: 4px solid;
    background: var(--xp-cursor-tag-face);
    font: 11px/14px Tahoma, 'Segoe UI', sans-serif;
    color: #000;
    white-space: nowrap;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pulse {
    position: absolute;
    left: -10px;
    top: -10px;
    width: 20px;
    height: 20px;
    border: 2px solid var(--agent);
    border-radius: 50%;
    animation: pulse 0.6s ease-out 2;
    opacity: 0;
  }
  @keyframes pulse {
    from {
      transform: scale(0.4);
      opacity: 1;
    }
    to {
      transform: scale(1.6);
      opacity: 0;
    }
  }
</style>
