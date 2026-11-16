<script lang="ts">
  import Button from '../kit/atoms/Button.svelte'
  import type { ToolGroup } from '@shared/desktop'
  import { toolChips } from './activity'

  interface Props {
    title: string
    /** What the agent is doing right now; null = idle. */
    working: string | null
    paused: boolean
    userInControl: boolean
    tools: ToolGroup[]
    onpause?: () => void
    ontakecontrol?: () => void
  }

  let { title, working, paused, userInControl, tools, onpause, ontakecontrol }: Props = $props()

  const chips = $derived(toolChips(tools))
  const status = $derived(paused ? 'Paused' : working ? `Working: ${working}` : 'Idle')
  const state = $derived(paused ? 'paused' : working ? 'working' : 'idle')
</script>

<div class="w7-topbar" data-testid="topbar" data-state={state} role="region" aria-label="Agent strip">
  <div class="row">
    <span class="dot {state}" aria-hidden="true"></span>
    <span class="who"><strong>Agent7</strong> · {title}</span>
    <span class="status" data-testid="topbar-status" title={status}>{status}</span>
    <Button data-testid="topbar-pause" onclick={() => onpause?.()}>{paused ? 'Resume' : 'Pause'}</Button>
    <Button data-testid="topbar-take-control" onclick={() => ontakecontrol?.()} aria-pressed={userInControl}>{userInControl ? 'Release' : 'Take control'}</Button>
  </div>
  <div class="chips" data-testid="topbar-tool-chips" aria-label="Tools the agent can use now">
    <span class="lead">Agent can use</span>
    {#each chips as chip (chip.group)}<span class="chip" data-testid="topbar-tool-chip-{chip.group.replaceAll('.', '-')}">{chip.label}</span>{:else}<span class="none" data-testid="topbar-tool-chips-none">nothing yet (open an app)</span>{/each}
  </div>
</div>

<style>
  .w7-topbar {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100000;
    box-sizing: border-box;
    min-width: 560px;
    max-width: calc(100% - 340px);
    padding: 3px 8px 3px;
    border: 1px solid #5d6c82;
    border-top: 0;
    border-radius: 0 0 5px 5px;
    background: linear-gradient(#fdfefe, #e6edf7 55%, #d8e3f2);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7), 0 2px 8px rgba(0, 0, 0, 0.45);
    font: var(--w7-font);
    color: #000;
    user-select: none;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 26px;
  }
  .who {
    flex: none;
    white-space: nowrap;
  }
  .status {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #333;
  }
  .dot {
    flex: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.45);
  }
  .dot.working {
    background: radial-gradient(circle at 35% 30%, #b9f4ac, #2fb12f 70%);
  }
  .dot.idle {
    background: radial-gradient(circle at 35% 30%, #e8eef6, #9aa8ba 70%);
  }
  .dot.paused {
    background: radial-gradient(circle at 35% 30%, #fff1a8, #e0a800 70%);
  }
  .chips {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    padding: 1px 0 2px 18px;
    font-size: 11px;
  }
  .lead,
  .none {
    color: var(--w7-text-muted);
  }
  .chip {
    padding: 0 6px;
    line-height: 15px;
    border: 1px solid #98b8e0;
    border-radius: 8px;
    background: linear-gradient(#fbfcfe, #dbe7f6);
    color: #1d3a63;
  }
</style>
