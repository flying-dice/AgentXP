<script lang="ts">
  /**
   * The chat pane of an app window: the same collapsible right aside in every app (manuals/embedded-chat.md), hosted by the
   * window frame so no app wires it. It starts collapsed as a slim toggle on the frame edge; View > Chat pane and
   * Ctrl+Shift+C open it. The session is the window's `aside` session: created on the first message, deleted by "New
   * conversation" and when the window closes. The app only registers its context (`host.setContext`). The collapsed strip is a
   * tab with the word Chat that pulses while the chat has news; an app in Focus mode hides it (UX-153).
   */
  import { untrack } from 'svelte'
  import type { AppWindowState } from '@shared/desktop'
  import EmbeddedChat from '../apps/shared/EmbeddedChat.svelte'
  import ChatStrip from '../apps/shared/ChatStrip.svelte'
  import { chatStripHidden } from './chatStrip.svelte'
  import { chatAboutTitle } from '../app/session/folderLabel'
  import { paneMaxWidth, suggestionsFor } from './chatPane'
  import { asideCwd } from '@shared/desktop-views'
  import type { DesktopController } from './DesktopController.svelte'

  interface Props {
    window: AppWindowState
    desktop: DesktopController
    /** Width of the window's client area (the pane never takes more than 60 % of it, nor so much that the app has under 420 px). */
    available: number
  }

  let { window: w, desktop, available }: Props = $props()

  // svelte-ignore state_referenced_locally
  untrack(() => desktop.loadPane(w.id))

  const pane = $derived(desktop.paneOf(w.id))
  const maxWidth = $derived(paneMaxWidth(available))

  /** The session shown: what this panel just started (or ended) until `desktop.changed` says the same, else the window's. */
  let local = $state<number | null>(null)
  $effect(() => {
    const server = w.asideSessionId ?? 0
    untrack(() => {
      if (local !== null && local === server) local = null
    })
  })
  const sessionId = $derived(local ?? w.asideSessionId ?? 0)

  // News: the chat changed while the pane was closed.
  const live = $derived(sessionId > 0 ? desktop.sessions.byId(sessionId) : null)
  let seenAt = $state<string | null>(null)
  $effect(() => {
    if (!pane.collapsed || seenAt === null) seenAt = live?.updatedAt ?? ''
  })
  const news = $derived(pane.collapsed && live !== null && seenAt !== null && live.updatedAt > seenAt)

  // What is selected in the app is not reactive state: the chips ask again when the selection changes or the pointer comes to the pane.
  let seen = $state(0)
  $effect(() => {
    const again = (): number => seen++
    document.addEventListener('selectionchange', again)
    return () => document.removeEventListener('selectionchange', again)
  })
  const suggestions = $derived((void seen, suggestionsFor(w.app, desktop.contextOf(w.id), w.id)))
  /** Where the pane works: the project drive of the window's view, else the agent's home ("Chat about login-app (E:)"). */
  const cwd = $derived(asideCwd(w.view, desktop.state.home))
  const heading = $derived(chatAboutTitle(cwd, desktop.state.drives))

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
  {#if !chatStripHidden.has(w.id)}
    <ChatStrip testid="chat-pane-toggle" {news} label={w.app === 'code' ? 'Ask about this file' : undefined} title="Chat (Ctrl+Shift+C): ask about what you are looking at" onopen={() => desktop.setChatPane(w.id, true)} />
  {/if}
{:else}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="pane" data-testid="chat-pane" data-window-id={w.id} onpointerenter={() => seen++} onpointerdown={() => seen++}>
    <EmbeddedChat
      host={desktop}
      {sessionId}
      role="aside"
      title={w.view.app === 'browser' ? 'Chat about this page' : heading}
      onopenwindow={() => void desktop.startChat(cwd)}
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
</style>
