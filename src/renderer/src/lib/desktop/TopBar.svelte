<script lang="ts">
  import Button from '../kit/atoms/Button.svelte'
  import type { ToolGroup } from '@shared/desktop'
  import { toolChips } from './activity'
  import ConnectionBar from './ConnectionBar.svelte'

  interface Props {
    title: string
    /** What the agent is doing right now; null = idle. */
    working: string | null
    paused: boolean
    userInControl: boolean
    tools: ToolGroup[]
    onpause?: () => void
    ontakecontrol?: () => void
    /** The OS window is maximised. */
    maximized?: boolean
    onminimize?: () => void
    onmaximize?: () => void
    /** Disconnect: closes the window, the agents keep running. */
    ondisconnect?: () => void
    /** A red chip next to the status when an agent could not start ("Agent: not started"); null = all is well. */
    agentProblem?: string | null
  }

  let { title, working, paused, userInControl, tools, onpause, ontakecontrol, maximized = false, onminimize, onmaximize, ondisconnect, agentProblem = null }: Props = $props()

  let pinned = $state(true)

  const chips = $derived(toolChips(tools))
  // One derivation for the text, the dot and `data-state`, so they cannot disagree.
  const view = $derived<{ state: 'paused' | 'working' | 'idle'; text: string }>(
    paused ? { state: 'paused', text: 'Paused' } : working ? { state: 'working', text: `Working: ${working}` } : { state: 'idle', text: 'Idle' }
  )
  const status = $derived(view.text)
  const mode = $derived(view.state)
</script>

<div class="w7-topbar" class:folded={!pinned} data-testid="topbar" data-state={mode} role="region" aria-label="Agent strip">
  <ConnectionBar {title} bind:pinned {maximized} {onminimize} {onmaximize} {ondisconnect}>
    <span class="dot" class:working={mode === 'working'} class:idle={mode === 'idle'} class:paused={mode === 'paused'} data-testid="topbar-dot" data-state={mode} aria-hidden="true"></span>
    <span class="status" data-testid="topbar-status" title={status}>{status}</span>
    {#if agentProblem}<span class="problem" data-testid="topbar-agent-problem" title="Open the Control Center, then Agents, to change the command of the agent.">{agentProblem}</span>{/if}
  </ConnectionBar>
  <div class="body">
    <div class="chips" data-testid="topbar-tool-chips" aria-label="Tools the agent can use now">
      <span class="lead">Agent can use</span>
      {#each chips as chip (chip.group)}<span class="chip" data-testid="topbar-tool-chip-{chip.group.replaceAll('.', '-')}">{chip.label}</span>{:else}<span class="none" data-testid="topbar-tool-chips-none">nothing yet (open an app)</span>{/each}
    </div>
    <Button data-testid="topbar-pause" onclick={() => onpause?.()}>{paused ? 'Resume' : 'Pause'}</Button>
    <Button data-testid="topbar-take-control" onclick={() => ontakecontrol?.()} aria-pressed={userInControl}>{userInControl ? 'Release' : 'Take control'}</Button>
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
    padding: 0 8px 3px;
    border: 1px solid #5d6c82;
    border-top: 0;
    border-radius: 0 0 5px 5px;
    overflow: hidden;
    background: linear-gradient(#fdfefe, #e6edf7 55%, #d8e3f2);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7), 0 2px 8px rgba(0, 0, 0, 0.45);
    font: var(--w7-font);
    color: #000;
    user-select: none;
  }
  .body {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding-top: 2px;
  }
  .w7-topbar.folded .body {
    display: none;
  }
  .w7-topbar.folded:hover .body,
  .w7-topbar.folded:has(:focus-visible) .body {
    display: flex;
  }
  .problem {
    flex: none;
    margin-left: 6px;
    padding: 0 6px;
    border: 1px solid #a02020;
    border-radius: 2px;
    background: #c62828;
    color: #fff;
    white-space: nowrap;
  }
  .status {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #1b2433;
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
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    padding: 2px 0 2px 2px;
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
