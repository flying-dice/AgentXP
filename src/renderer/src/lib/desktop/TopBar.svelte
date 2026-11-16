<script lang="ts">
  import Button from '../kit/atoms/Button.svelte'
  import CheckBox from '../kit/atoms/CheckBox.svelte'
  import type { ToolGroup, ToolPolicyDto } from '@shared/desktop'
  import { RESUME_BUTTON, barStatus, toolChips, toolsLine } from './activity'
  import ConnectionBar from './ConnectionBar.svelte'

  interface Props {
    title: string
    /** What the agent is doing right now; null = idle. */
    working: string | null
    /** Requests that wait for the user's answer; the status then reads "Waiting for you: n requests to approve" as a link. */
    waiting?: number
    /** Chat windows that are open: an open chat is something the agent can use. */
    chatsOpen?: number
    paused: boolean
    /** "Ask before every action": the agent must ask before it reads, writes, runs a command or uses the browser. */
    userInControl: boolean
    tools: ToolGroup[]
    /** The Control Center permissions; chips read Allow, Ask or Deny from them. */
    policy?: ToolPolicyDto | null
    /** A short line that stands in for "Idle" for a few seconds ("Resumed. Nothing was stopped."). */
    notice?: string | null
    onpause?: () => void
    /** The "Waiting for you" link: opens the next request. */
    onopenrequest?: () => void
    /** The "Ask before every action" check box and the "Give control back" button: switches the flag. */
    ontakecontrol?: () => void
    /** A chip was clicked: open Control Center at Permissions. */
    onopenpermissions?: () => void
    /** The OS window is maximised. */
    maximized?: boolean
    onminimize?: () => void
    onmaximize?: () => void
    /** Disconnect: closes the window, the agents keep running. */
    ondisconnect?: () => void
    /** A red chip next to the status when an agent could not start ("Agent: not started"); null = all is well. */
    agentProblem?: string | null
  }

  let { title, working, waiting = 0, chatsOpen = 0, paused, userInControl, tools, policy = null, notice = null, onpause, onopenrequest, ontakecontrol, onopenpermissions, maximized = false, onminimize, onmaximize, ondisconnect, agentProblem = null }: Props = $props()

  let pinned = $state(true)

  const chips = $derived(toolChips(tools, policy, userInControl))
  const toolsNote = $derived(toolsLine(tools, chatsOpen))
  // One derivation for the text, the dot and `data-state`, so they cannot disagree.
  const view = $derived(barStatus({ paused, userInControl, working, waiting, notice }))
  const status = $derived(view.text)
  const mode = $derived(view.state)
</script>

<div class="w7-topbar" class:folded={!pinned} data-testid="topbar" data-state={mode} role="region" aria-label="Agent strip">
  <ConnectionBar {title} bind:pinned {maximized} {onminimize} {onmaximize} {ondisconnect}>
    <span class="dot" class:working={mode === 'working'} class:idle={mode === 'idle'} class:paused={mode === 'paused'} class:control={mode === 'control'} class:waiting={mode === 'waiting'} data-testid="topbar-dot" data-state={mode} aria-hidden="true"></span>
    <span class="status" class:alert={mode === 'paused' || mode === 'control' || mode === 'waiting'} role="status" data-testid="topbar-status" title={status}>
      {#if mode === 'waiting'}<button type="button" class="link" data-testid="topbar-waiting-link" title="Open the next request." onclick={() => onopenrequest?.()}>{status}</button>{:else}{status}{/if}
    </span>
    {#if userInControl && !paused}
      <button type="button" class="give-back" data-testid="topbar-give-back" title="The agent goes back to the settings in Control Center and no longer asks before every action." onclick={() => ontakecontrol?.()}>Give control back</button>
    {/if}
    {#if agentProblem}<span class="problem" data-testid="topbar-agent-problem" title="Open the Control Center, then Agents, to change the command of the agent.">{agentProblem}</span>{/if}
  </ConnectionBar>
  <div class="body">
    <div class="chips" data-testid="topbar-tool-chips" role="group" aria-label="What the agent can use" title="The agent can use only what is open here. Closing an app takes its tool away.">
      <span class="lead">Agent can use</span>
      {#each chips as chip (chip.group)}
        <button type="button" class="chip" data-state={chip.state} data-testid="topbar-tool-chip-{chip.group.replaceAll('.', '-')}" title={chip.tooltip} onclick={() => onopenpermissions?.()}>{chip.label}</button>
      {/each}
      {#if toolsNote}<span class="none" data-testid="topbar-tool-chips-none">{toolsNote}</span>{/if}
    </div>
    <span class="pause-slot">
      <Button
        data-testid="topbar-pause"
        title={paused ? 'Let every agent act again. A step that Pause stopped is asked to continue where it stopped.' : 'Pause every agent on this desktop. Each one stops now and does nothing until you click Resume agents and continue. Chats and files stay as they are.'}
        onclick={() => onpause?.()}>{paused ? RESUME_BUTTON : 'Pause all agents'}</Button>
    </span>
    <span class="ask-slot" title="You decide on every action. The agent asks first, even for reading.">
      <CheckBox testid="topbar-take-control" label="Ask before every action" checked={userInControl} onchange={() => ontakecontrol?.()} />
    </span>
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
    /* As wide as its content (one row of chips) up to the room the gadget column leaves. */
    width: max-content;
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
  .dot.paused,
  .dot.control {
    background: radial-gradient(circle at 35% 30%, #fff1a8, #e0a800 70%);
  }
  .dot.waiting {
    background: radial-gradient(circle at 35% 30%, #ffd6a8, #e07a00 70%);
  }
  .chips {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    padding: 0 0 0 2px;
    font-size: 11px;
  }
  .lead,
  .none {
    color: var(--w7-text-muted);
  }
  /* Flat labels that read as state, not raised buttons: a click opens Permissions. */
  .chip {
    box-sizing: border-box;
    /* 24 x 24 px at least (WCAG 2.5.8 target size). */
    min-width: 24px;
    min-height: 24px;
    /* The bottom margin keeps the bar as high as before: the hit area reaches into the padding under the row. */
    margin: 0 0 -3px;
    padding: 0 6px;
    line-height: 20px;
    border: 1px solid #b9c7da;
    border-radius: 8px;
    background: #f4f7fb;
    color: #1d3a63;
    font: inherit;
    font-size: 11px;
    cursor: pointer;
  }
  .chip:hover {
    text-decoration: underline;
  }
  .chip[data-state='asks'] {
    border-color: #d9b44a;
    background: #fff4cf;
    color: #5f4300;
  }
  .chip[data-state='off'] {
    border-style: dashed;
    background: transparent;
    color: #4b5666;
  }
  .chip:hover {
    border-color: var(--w7-hot-border);
  }
  .chip:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: 1px;
  }
  .status.alert {
    padding: 0 6px;
    border: 1px solid #d9b44a;
    background: #fff4cf;
    color: #5f4300;
  }
  .link {
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
  .link:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: 1px;
  }
  .give-back {
    flex: none;
    margin-left: 6px;
    padding: 0 8px;
    line-height: 15px;
    border: 1px solid #d9b44a;
    border-radius: 8px;
    background: #fff4cf;
    color: #5f4300;
    font: inherit;
    font-size: 11px;
    white-space: nowrap;
    cursor: pointer;
  }
  .give-back:hover {
    border-color: var(--w7-hot-border);
    text-decoration: underline;
  }
  .give-back:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: 1px;
  }
  /* The two controls keep their place when their text changes. */
  .pause-slot {
    flex: none;
    width: 176px;
  }
  .pause-slot :global(.w7-btn) {
    width: 100%;
    min-width: 0;
  }
  .ask-slot {
    flex: none;
    width: 168px;
    padding-top: 3px;
  }
</style>
