<script lang="ts">
  import Button from '../kit/atoms/Button.svelte'
  import { tooltip } from '../kit/actions/tooltip'
  import CheckBox from '../kit/atoms/CheckBox.svelte'
  import type { ToolGroup, ToolPolicyDto } from '@shared/desktop'
  import { NOT_SAVED_NOTE, PAUSE_TIP, RESUME_BUTTON, RESUME_CONTROL_BUTTON, RESUME_CONTROL_TIP, TAKE_CONTROL_LABEL, barStatus, chipAriaLabel, closedAppNames, toolChips, toolsLine } from './activity'
  import ConnectionBar from './ConnectionBar.svelte'

  interface Props {
    title: string
    /** What the agent is doing right now; null = idle. */
    working: string | null
    /** Requests that wait for the user's answer; the status then reads "Waiting for you: n requests to approve" as a link. */
    waiting?: number
    /** The words of the link when it names the chat that waits ("Fix login is waiting: run a command (1 of 2 waiting)"); else the count is said. */
    waitingFor?: string | null
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
    /** The "Ask before every action" check box and the "Resume" button: switches the flag. */
    ontakecontrol?: () => void
    /** A chip was clicked: open Control Center at Permissions with the row of that tool selected. */
    onopenpermissions?: (group: string) => void
    /** The OS window is maximised. */
    maximized?: boolean
    onminimize?: () => void
    onmaximize?: () => void
    /** Disconnect: closes the window, the agents keep running. */
    ondisconnect?: () => void
    /** A red chip next to the status when an agent could not start ("Agent: not started"); null = all is well. */
    agentProblem?: string | null
  }

  let { title, working, waiting = 0, waitingFor = null, chatsOpen = 0, paused, userInControl, tools, policy = null, notice = null, onpause, onopenrequest, ontakecontrol, onopenpermissions, maximized = false, onminimize, onmaximize, ondisconnect, agentProblem = null }: Props = $props()

  let pinned = $state(true)
  /** The tooltip of the chip that has the keyboard focus, shown in a line of the bar (a tooltip needs a pointer to appear). */
  let focusTip = $state<string | null>(null)

  const chips = $derived(toolChips(tools, policy, userInControl))
  const toolsNote = $derived(toolsLine(tools, chatsOpen))
  // One derivation for the text, the dot and `data-state`, so they cannot disagree.
  const view = $derived(barStatus({ paused, userInControl, working, waiting, waitingFor, notice, closedApps: closedAppNames(chips) }))
  const status = $derived(view.text)
  const mode = $derived(view.state)
</script>

<div class="w7-topbar" class:folded={!pinned} data-testid="topbar" data-state={mode} role="region" aria-label="Agent strip">
  <ConnectionBar {title} bind:pinned {maximized} {onminimize} {onmaximize} {ondisconnect}>
    <span class="dot" class:working={mode === 'working'} class:idle={mode === 'idle'} class:paused={mode === 'paused'} class:control={mode === 'control'} class:waiting={mode === 'waiting'} data-testid="topbar-dot" data-state={mode} aria-hidden="true"></span>
    <span class="status" class:alert={mode === 'paused' || mode === 'control' || mode === 'waiting'} role="status" data-testid="topbar-status" title={status}>
      {#if mode === 'waiting'}<button type="button" class="link" data-testid="topbar-waiting-link" title="Go to the chat that waits, where you can allow or deny the request." onclick={() => onopenrequest?.()}>{status}</button>{:else}{status}{/if}
    </span>
    {#if userInControl && !paused}
      <button type="button" class="give-back" data-testid="topbar-give-back" title={RESUME_CONTROL_TIP} onclick={() => ontakecontrol?.()}>{RESUME_CONTROL_BUTTON}</button>
    {/if}
    {#if agentProblem}<span class="problem" data-testid="topbar-agent-problem" title="Open the Control Center, then Agents, to change the command of the agent.">{agentProblem}</span>{/if}
  </ConnectionBar>
  <div class="body">
    <div class="chips" data-testid="topbar-tool-chips" role="group" aria-label="What the agent can use">
      <span class="lead" use:tooltip={'The agent can use only what is open here. Closing an app takes its tool away.'}>Agent can use</span>
      {#each chips as chip (chip.group)}
        <button type="button" class="chip" data-state={chip.state} data-closed={chip.closed} data-testid="topbar-tool-chip-{chip.group.replaceAll('.', '-')}" use:tooltip={chip.tooltip} aria-label={chipAriaLabel(chip)} onclick={() => onopenpermissions?.(chip.group)} onfocus={(e) => (focusTip = e.currentTarget.matches(':focus-visible') ? chip.tooltip : null)} onblur={() => (focusTip = null)}>{chip.label}</button>
      {/each}
      {#if toolsNote}<span class="none" data-testid="topbar-tool-chips-none">{toolsNote}</span>{/if}
    </div>
    <span class="pause-slot">
      <Button
        data-testid="topbar-pause"
        title={paused ? 'Let every agent act again. A step that Pause stopped is asked to continue where it stopped.' : `${PAUSE_TIP}. Each agent stops now and does nothing until you click Resume agents and continue. Chats and files stay as they are.`}
        onclick={() => onpause?.()}>{paused ? RESUME_BUTTON : 'Pause all agents'}</Button>
    </span>
    <span class="ask-slot" data-testid="topbar-ask-slot" title="You decide on every action. The agent asks first, even for reading. This lasts until you clear the box or click Resume, and it is not saved.">
      <CheckBox testid="topbar-take-control" label={TAKE_CONTROL_LABEL} checked={userInControl} onchange={() => ontakecontrol?.()} />
    </span>
  </div>
  {#if userInControl && !paused}
    <p class="note" data-testid="topbar-control-note">{NOT_SAVED_NOTE.before}<button type="button" class="link" data-testid="topbar-control-note-link" onclick={() => onopenpermissions?.('')}>{NOT_SAVED_NOTE.link}</button>{NOT_SAVED_NOTE.after}</p>
  {/if}
  {#if focusTip}<p class="note tip" role="status" data-testid="topbar-chip-tip">{focusTip}</p>{/if}
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
  /* Buttons that show the state: a border and a hover face say they can be clicked, and a click opens Permissions (UX-142). */
  .chip {
    box-sizing: border-box;
    /* 24 x 24 px at least (WCAG 2.5.8 target size). */
    min-width: 24px;
    min-height: 24px;
    /* The bottom margin keeps the bar as high as before: the hit area reaches into the padding under the row. */
    margin: 0 0 -3px;
    padding: 0 6px;
    line-height: 20px;
    border: 1px solid #8fa3c0;
    border-radius: 8px;
    background: linear-gradient(#fdfeff, #e3ecf8);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
    color: #1d3a63;
    font: inherit;
    font-size: 11px;
    cursor: pointer;
  }
  .chip:hover {
    background: var(--w7-btn-hover-face, #eaf6fd);
    text-decoration: underline;
  }
  .chip:active {
    background: var(--w7-select-face, #c4e5f6);
  }
  .chip[data-state='asks'] {
    border-color: #d9b44a;
    background: linear-gradient(#fffbea, #fff0c2);
    color: #5f4300;
  }
  /* Denied: still a button with a setting, so the border stays solid. */
  .chip[data-state='off'] {
    background: linear-gradient(#fbfbfc, #eceef2);
    color: #4b5666;
  }
  /* The dashed border is only for a chip with no setting to change yet: its app is not open (UX-159). */
  .chip[data-closed='true'] {
    border-style: dashed;
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
  .note {
    margin: 2px 0 0;
    padding: 0 2px;
    font-size: 11px;
    color: #5f4300;
  }
  .note.tip {
    color: #1b2433;
    white-space: pre-line;
  }
  .ask-slot {
    flex: none;
    width: 252px;
    padding-top: 3px;
  }
</style>
