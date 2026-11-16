<script lang="ts">
  /**
   * The chat pane of an app window: the same collapsible right aside in every app (manuals/embedded-chat.md), hosted by the
   * window frame so no app wires it. It starts collapsed as a slim toggle on the frame edge; View > Chat pane and
   * Ctrl+Shift+C open it. The session is the window's `aside` session: created on the first message, deleted by "New
   * conversation" and when the window closes. The app only registers its context (`host.setContext`).
   */
  import { untrack } from 'svelte'
  import type { AppWindowState } from '@shared/desktop'
  import EmbeddedChat from '../apps/shared/EmbeddedChat.svelte'
  import Icon from '../kit/atoms/Icon.svelte'
  import { PANE_MIN_WIDTH, suggestionsFor } from './chatPane'
  import type { DesktopController } from './DesktopController.svelte'

  interface Props {
    window: AppWindowState
    desktop: DesktopController
    /** Width of the window's client area (the pane never takes more than 60 % of it). */
    available: number
  }

  let { window: w, desktop, available }: Props = $props()

  // svelte-ignore state_referenced_locally
  untrack(() => desktop.loadPane(w.id))

  const pane = $derived(desktop.paneOf(w.id))
  const maxWidth = $derived(Math.max(PANE_MIN_WIDTH, Math.floor(available * 0.6)))

  /** The session shown: what this panel just started (or ended) until `desktop.changed` says the same, else the window's. */
  let local = $state<number | null>(null)
  $effect(() => {
    const server = w.asideSessionId ?? 0
    untrack(() => {
      if (local !== null && local === server) local = null
    })
  })
  const sessionId = $derived(local ?? w.asideSessionId ?? 0)

  const suggestions = $derived(suggestionsFor(w.app, desktop.contextOf(w.id)))

  async function start(): Promise<number> {
    const id = await desktop.openAside(w.id)
    local = id
    return id
  }

  async function startOver(): Promise<void> {
    local = 0
    await desktop.closeAside(w.id)
  }
</script>

{#if pane.collapsed}
  <button type="button" class="edge" data-testid="chat-pane-toggle" aria-label="Show chat pane" title="Show chat pane (Ctrl+Shift+C)" onclick={() => desktop.setChatPane(w.id, true)}>
    <Icon name="chevron-left" size={12} />
    <span class="label">Chat</span>
  </button>
{:else}
  <div class="pane" data-testid="chat-pane" data-window-id={w.id}>
    <EmbeddedChat
      host={desktop}
      {sessionId}
      role="aside"
      title="Chat pane"
      collapsible
      resizable
      compact
      contained
      contextProvider={() => desktop.contextOf(w.id)}
      bind:collapsed={() => pane.collapsed, (collapsed) => desktop.setChatPane(w.id, !collapsed)}
      bind:width={() => Math.min(pane.width, maxWidth), (width) => desktop.setPaneWidth(w.id, width)}
      onstart={start}
      onnew={startOver}
      {suggestions}
      prefill={desktop.prefills[w.id] ?? null}
      onprefilled={(id) => desktop.prefillApplied(w.id, id)}
    />
  </div>
{/if}

<style>
  .pane {
    flex: none;
    display: flex;
    min-width: 0;
    min-height: 0;
    border-left: 1px solid #9aa9bf;
  }
  .edge {
    flex: none;
    width: 24px;
    min-width: 24px;
    padding: 6px 0 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    background: linear-gradient(90deg, #f9fbfd, #e4ecf6);
    border: 0;
    border-left: 1px solid #9aa9bf;
    border-radius: 0;
    cursor: pointer;
  }
  .label {
    writing-mode: vertical-rl;
    color: var(--w7-text-muted);
  }
  .edge:hover {
    background: var(--w7-btn-hover-face);
  }
</style>
