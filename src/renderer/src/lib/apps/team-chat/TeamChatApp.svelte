<script lang="ts">
  /**
   * Team Chat: a chat room, not an agent pipeline. Every member of the team is its own agent session and answers in the
   * room under its own name. Call a member with @name: it starts at once, and several can work at the same time.
   * The room shows final messages only; a member shows "thinking…" while it works. A member's own session opens in the panel.
   */
  import { onMount, tick, untrack } from 'svelte'
  import type { RoomStateDto } from '@shared/teams'
  import { activityLabel, mentionedMembers } from '@shared/teams'
  import type { AppProps } from '../types'
  import Button from '../../kit/atoms/Button.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import { closeItems, menuBar } from '../../kit/molecules/standardMenu'
  import type { MenuDef } from '../../kit/molecules/MenuItem'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import { useAppContext } from '../shared/appContext.svelte'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import EmbeddedChat from '../shared/EmbeddedChat.svelte'
  import { initialOf, insertMention, nearBottom, timeOf, workingLine } from './roomModel'

  let { window: win, host, focused }: AppProps<'team-chat'> = $props()

  const roomId = $derived(win.view.roomId)
  let room = $state.raw<RoomStateDto | null>(null)
  let draft = $state('')
  let error = $state('')
  let list: HTMLDivElement | undefined = $state()
  let composer = $state<HTMLTextAreaElement | HTMLInputElement | null>(null)
  let stick = true
  const openMemberId = $derived(win.view.openMemberId ?? null)
  const openMember = $derived(room?.members.find((m) => m.profileId === openMemberId) ?? null)
  const working = $derived(room ? workingLine(room.members) : '')

  async function load(): Promise<void> {
    try {
      room = await host.api.rooms.state(roomId)
      error = ''
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }

  onMount(() => {
    void load()
    const changed = host.api.on('room.changed', (next) => {
      if (next.room.id === roomId) room = next
    })
    const removed = host.api.on('room.removed', ({ id }) => {
      if (id === roomId) void host.closeWindow(win.id)
    })
    return () => {
      changed()
      removed()
    }
  })

  // The window title follows the room; new messages scroll into view unless the user scrolled up to read.
  $effect(() => {
    const title = room?.room.title
    if (title && title !== win.view.title) untrack(() => host.updateView(win.id, { ...win.view, title }))
  })
  $effect(() => {
    void room?.messages.length
    if (!list || !stick) return
    void tick().then(() => list && (list.scrollTop = list.scrollHeight))
  })
  $effect(() => {
    if (focused) untrack(() => composer?.focus())
  })

  async function send(): Promise<void> {
    const text = draft.trim()
    if (!text) return
    draft = ''
    stick = true
    try {
      await host.api.rooms.say(roomId, text)
    } catch (e) {
      draft = text
      error = e instanceof Error ? e.message : String(e)
    }
  }

  function onkeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault()
      void send()
    }
  }

  const mention = (name: string): void => {
    draft = insertMention(draft, name)
    composer?.focus()
  }

  const openSession = (profileId: number | null): void => host.updateView(win.id, { ...win.view, openMemberId: profileId })

  /** The members a draft calls, shown under the box ("Calls: Coder"); a draft without a mention goes to the member who spoke last. */
  const calls = $derived(room ? mentionedMembers(draft, room.members).map((m) => m.name) : [])

  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'team-chat')
  const ctx = new ContextMenu()
  const memberItems = () => (room?.members ?? []).map((m) => ({ id: `team-chat-ctx-mention-${m.profileId}`, testid: 'team-chat-ctx-mention', label: `Call ${m.name}`, action: () => mention(m.name) }))
  // svelte-ignore state_referenced_locally
  useAppContext(host, () => win.id, () => ({ room: room?.room.title, members: room?.members.map((m) => m.name), lastMessage: room?.messages.at(-1)?.text }))

  const menus = $derived<MenuDef[]>(
    menuBar([
      { label: '&File', items: closeItems('team-chat', () => void host.closeWindow(win.id)) },
      { label: '&View', items: [{ id: 'team-chat-view-panel', testid: 'team-chat-menu-hide-session', label: 'Hide member session', disabled: openMemberId === null, action: () => openSession(null) }] },
      help.menu()
    ])
  )
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="room" data-testid="team-chat-app" oncontextmenu={(e) => ctx.show(e, memberItems())} onkeydown={(e) => ctx.key(e, memberItems)}>
  <MenuStrip {menus} aria-label="Team Chat menu" />
  <div class="row">
    <div class="col">
      <div class="members" data-testid="team-chat-members" role="list" aria-label="Members">
        {#each room?.members ?? [] as m (m.profileId)}
          {@const label = activityLabel(m.activity, m.queued)}
          <div class="member" role="listitem" data-testid="team-chat-member" data-activity={m.activity} data-member={m.name}>
            <button class="chip" title="Call {m.name}" data-testid="team-chat-member-call" onclick={() => mention(m.name)}>
              <span class="avatar" style:background={m.color} aria-hidden="true">{initialOf(m.name)}</span>
              <span class="name">{m.name}</span>
            </button>
            <span class="activity" class:busy={m.activity !== 'idle'} data-testid="team-chat-member-activity">{label ?? ''}</span>
            {#if m.activity === 'thinking' || m.activity === 'starting' || m.activity === 'waiting' || m.queued > 0}
              <Button data-testid="team-chat-member-stop" onclick={() => void host.api.rooms.stop(roomId, m.profileId)}>Stop</Button>
            {/if}
            {#if m.sessionId !== null}
              <Button data-testid="team-chat-member-session" aria-pressed={openMemberId === m.profileId} onclick={() => openSession(openMemberId === m.profileId ? null : m.profileId)}>Session</Button>
            {/if}
          </div>
        {/each}
      </div>
      <div class="messages" bind:this={list} data-testid="team-chat-messages" role="log" aria-label="Messages" aria-live="polite" onscroll={() => list && (stick = nearBottom(list))}>
        {#each room?.messages ?? [] as msg (msg.id)}
          {@const from = room?.members.find((m) => m.profileId === msg.profileId)}
          <div class="msg" class:mine={msg.profileId === null} data-testid="team-chat-message" data-author={msg.author}>
            <span class="avatar" style:background={from?.color ?? '#6b7a90'} aria-hidden="true">{initialOf(msg.author)}</span>
            <div class="bubble">
              <div class="head"><span class="author" data-testid="team-chat-message-author">{msg.author}</span><span class="time">{timeOf(msg.createdAt)}</span></div>
              <div class="text" data-testid="team-chat-message-text">{msg.text}</div>
            </div>
          </div>
        {:else}
          <div class="empty" data-testid="team-chat-empty">Say something to start. Write @name to call a member; a message without one goes to {room?.members[0]?.name ?? 'the first member'}.</div>
        {/each}
        {#if working}<div class="working" role="status" data-testid="team-chat-working">{working}</div>{/if}
      </div>
      <div class="composer">
        <TextBox data-testid="team-chat-input" multiline rows={2} bind:value={draft} bind:ref={composer} placeholder="Message the room. @name calls a member." aria-label="Message" {onkeydown} />
        <Button data-testid="team-chat-send" disabled={!draft.trim()} onclick={() => void send()}>Send</Button>
      </div>
      <StatusStrip>
        <StatusStripLabel text={error || (calls.length ? `Calls: ${calls.join(', ')}` : (room?.room.cwd ?? ''))} />
      </StatusStrip>
    </div>
    {#if openMember && openMember.sessionId !== null}
      <aside class="panel" data-testid="team-chat-session-panel" aria-label="Session of {openMember.name}">
        <EmbeddedChat {host} sessionId={openMember.sessionId} title={openMember.name} role="aside" collapsible={false} resizable contained />
      </aside>
    {/if}
  </div>
  <ContextMenuStrip bind:open={ctx.open} x={ctx.x} y={ctx.y} items={ctx.items} label="Team Chat" />
  <AppAbout {help} />
</div>

<style>
  .room {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-window);
  }
  .row {
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .panel {
    flex: none;
    width: 340px;
    min-height: 0;
    display: flex;
    border-left: 1px solid var(--w7-group-border);
  }
  .members {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--w7-group-border);
    background: linear-gradient(#fdfeff, #e9f0fa);
  }
  .member {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .chip {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 1px 6px 1px 2px;
    border: 1px solid transparent;
    background: transparent;
    font: inherit;
    cursor: default;
  }
  .chip:hover {
    border-color: var(--w7-hot-border);
    background: var(--w7-hot-face);
  }
  .avatar {
    flex: none;
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
  }
  .activity {
    min-width: 0;
    color: #555;
    font-style: italic;
  }
  .activity.busy {
    color: #1e3287;
  }
  .messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 10px;
    background: #fff;
  }
  .msg {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }
  .bubble {
    min-width: 0;
    max-width: 85%;
  }
  .head {
    display: flex;
    gap: 8px;
    align-items: baseline;
  }
  .author {
    font-weight: 700;
    color: #1e3287;
  }
  .mine .author {
    color: #333;
  }
  .time {
    color: #777;
    font-size: 11px;
  }
  .text {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
  }
  .empty,
  .working {
    color: #555;
    font-style: italic;
  }
  .composer {
    flex: none;
    display: flex;
    gap: 6px;
    align-items: flex-end;
    padding: 6px 8px;
    border-top: 1px solid var(--w7-group-border);
    background: var(--w7-window);
  }
  .composer :global(.w7-textbox) {
    flex: 1;
    min-width: 0;
  }
</style>
