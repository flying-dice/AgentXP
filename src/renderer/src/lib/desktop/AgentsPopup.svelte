<script lang="ts">
  /**
   * The top-bar agents popup (`docs/AGENT_PRESENCE.md`, section 4): with two or more chats working, "3 agents working"
   * opens this XP task pane below the bar. One row per agent: its colour swatch and name (never colour alone), its step
   * in plain words, **Open chat** and **Follow**. Esc, a click outside or any action closes it.
   */
  import { onMount } from 'svelte'
  import { clickOutside } from '../kit/actions/clickOutside'
  import { keepPlaced, placePopup } from '../kit/actions/popup'
  import { portal } from '../kit/actions/portal'
  import TaskPaneLink from '../kit/molecules/TaskPaneLink.svelte'
  import type { WorkingAgent } from './activity'

  interface Props {
    /** The "N agents working" link the popup hangs from. */
    anchor: HTMLElement
    agents: readonly WorkingAgent[]
    /** The chat the desktop follows (its row offers **Stop following**). */
    followingId?: number | null
    onopenchat?: (sessionId: number) => void
    onfollow?: (sessionId: number | null) => void
    onclose?: () => void
  }

  let { anchor, agents, followingId = null, onopenchat, onfollow, onclose }: Props = $props()

  let el: HTMLDivElement | undefined = $state()
  let left = $state(0)
  let top = $state(0)

  $effect(() => {
    const node = el
    if (!node) return
    return keepPlaced(node, (size) => {
      const placed = placePopup(anchor.getBoundingClientRect(), size)
      left = placed.left
      top = placed.top
    })
  })

  onMount(() => {
    // The first link takes the focus, so the keyboard can go down the rows (Tab) and Esc closes.
    el?.querySelector<HTMLElement>('button')?.focus()
  })

  function onkeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onclose?.()
      anchor.focus()
    }
  }

  const act = (run: () => void): void => {
    run()
    onclose?.()
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="agents"
  bind:this={el}
  use:portal
  use:clickOutside={{ handler: () => onclose?.(), ignore: anchor }}
  style:left="{left}px"
  style:top="{top}px"
  data-testid="topbar-agents-menu"
  role="dialog"
  aria-label="Agents working"
  tabindex="-1"
  {onkeydown}
>
  <header class="head">Agents working</header>
  <ul class="rows">
    {#each agents as agent (agent.sessionId)}
      <li class="row" data-testid="topbar-agents-row" data-session-id={agent.sessionId} data-agent={agent.identity.name}>
        <div class="who">
          <span class="swatch" style:background={agent.identity.color} aria-hidden="true"></span>
          <span class="name">{agent.identity.name}</span>
          <span class="chat" data-testid="topbar-agents-chat">{agent.title}</span>
        </div>
        <div class="step" data-testid="topbar-agents-step" title={agent.title}>{agent.step}</div>
        <div class="links">
          <TaskPaneLink label="Open chat" icon="session" testid="topbar-agents-open" title="Go to the chat of {agent.identity.name}: {agent.title}" onclick={() => act(() => onopenchat?.(agent.sessionId))} />
          {#if followingId === agent.sessionId}
            <TaskPaneLink label="Stop following" testid="topbar-agents-follow" title="Stop following {agent.identity.name}." onclick={() => act(() => onfollow?.(null))} />
          {:else}
            <TaskPaneLink label="Follow" testid="topbar-agents-follow" title="Watch {agent.identity.name} work: Code and the Terminal follow its steps and its cursor shows where it is." onclick={() => act(() => onfollow?.(agent.sessionId))} />
          {/if}
        </div>
      </li>
    {/each}
  </ul>
</div>

<style>
  .agents {
    position: fixed;
    box-sizing: border-box;
    width: 280px;
    max-height: calc(100vh - 80px);
    overflow-y: auto;
    border: 1px solid #fff;
    border-radius: 3px 3px 0 0;
    background: var(--xp-taskpane-body);
    box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.4);
    font: var(--xp-font);
    color: #000;
  }
  .agents:focus {
    outline: none;
  }
  .head {
    padding: 4px 10px;
    border-radius: 3px 3px 0 0;
    background: linear-gradient(90deg, #0c32a8 0, #2b6ae0 100%);
    color: #fff;
    font-weight: 700;
  }
  .rows {
    margin: 0;
    padding: 4px 10px 6px;
    list-style: none;
  }
  .row {
    padding: 5px 0;
    border-bottom: 1px solid #b4c3ea;
  }
  .row:last-child {
    border-bottom: 0;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .swatch {
    flex: none;
    width: 11px;
    height: 11px;
    border: 1px solid rgba(0, 0, 0, 0.45);
  }
  .name {
    font-weight: 700;
    color: var(--xp-taskpane-title);
  }
  .chat {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #4b5666;
  }
  .step {
    margin: 1px 0 2px 17px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #333;
  }
  .links {
    display: flex;
    gap: 14px;
    margin-left: 17px;
  }
</style>
