<script lang="ts">
  /**
   * Team Chat: a chat room, not an agent pipeline. Every member of the team is its own agent session and answers in the
   * room under its own name. Call a member with @name: it starts at once, and several can work at the same time.
   * The room shows final messages only; a member shows "thinking…" while it works. A member's own session opens in the panel.
   * It looks like a Windows Messenger conversation: a "To:" band, "Name says:" lines, a format bar over the message box,
   * and the blue "I want to..." side bar with the members and what each one does.
   */
  import { onMount, tick, untrack } from 'svelte'
  import type { RoomStateDto } from '@shared/teams'
  import { activityLabel, mentionedMembers } from '@shared/teams'
  import type { AppProps } from '../types'
  import Button from '../../kit/atoms/Button.svelte'
  import Icon from '../../kit/atoms/Icon.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import { closeItems, menuBar } from '../../kit/molecules/standardMenu'
  import type { MenuDef } from '../../kit/molecules/MenuItem'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import TaskPaneLink from '../../kit/molecules/TaskPaneLink.svelte'
  import TaskPanel from '../../kit/molecules/TaskPanel.svelte'
  import ToolStripDropDownButton from '../../kit/molecules/ToolStripDropDownButton.svelte'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import TaskPane from '../../kit/organisms/TaskPane.svelte'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import { useAppContext } from '../shared/appContext.svelte'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import EmbeddedChat from '../shared/EmbeddedChat.svelte'
  import { initialOf, insertMention, lastReceivedLine, nearBottom, timeOf, workingLine } from './roomModel'

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
  const isBusy = (m: { activity: string; queued: number }): boolean => m.activity === 'thinking' || m.activity === 'starting' || m.activity === 'waiting' || m.queued > 0
  const anyBusy = $derived((room?.members ?? []).some(isBusy))
  const stopAll = (): void => {
    for (const m of room?.members ?? []) if (isBusy(m)) void host.api.rooms.stop(roomId, m.profileId)
  }
  /** The Call drop-down of the format bar (where Messenger had Emoticons): a mention of one member, or of everyone. */
  const callItems = $derived([
    ...(room?.members ?? []).map((m) => ({ id: `team-chat-call-${m.profileId}`, testid: 'team-chat-call-member', label: m.name, action: () => mention(m.name) })),
    { id: 'team-chat-call-all', testid: 'team-chat-call-all', label: 'Everyone (@all)', action: () => mention('all') }
  ])
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
    <div class="conv">
      <div class="to" data-testid="team-chat-to">
        <span class="to-label">To:</span>
        <span class="to-names">{(room?.members ?? []).map((m) => m.name).join(', ')}{#if room?.room.title}<span class="to-room">{' '}({room.room.title})</span>{/if}</span>
      </div>
      <div class="history">
        <div class="messages" bind:this={list} data-testid="team-chat-messages" role="log" aria-label="Messages" aria-live="polite" onscroll={() => list && (stick = nearBottom(list))}>
          {#each room?.messages ?? [] as msg (msg.id)}
            <div class="msg" class:mine={msg.profileId === null} data-testid="team-chat-message" data-author={msg.author} title={timeOf(msg.createdAt)}>
              <div class="says"><span class="author" data-testid="team-chat-message-author">{msg.author}</span> {msg.profileId === null && msg.author === 'You' ? 'say' : 'says'}:</div>
              <div class="text" data-testid="team-chat-message-text">{msg.text}</div>
            </div>
          {:else}
            <div class="note" data-testid="team-chat-empty">
              <Icon name="user" />
              <span>Say something to start. Write @name to call a member; a message without one goes to {room?.members[0]?.name ?? 'the first member'}.</span>
            </div>
            <hr />
          {/each}
          {#if working}<div class="note" role="status" data-testid="team-chat-working"><Icon name="user" /><span>{working}</span></div>{/if}
        </div>
      </div>
      <div class="formatbar">
        <ToolStripDropDownButton testid="team-chat-call" icon="user" text="Call" title="Call a member: adds @name to your message" items={callItems} />
      </div>
      <div class="composer">
        <TextBox data-testid="team-chat-input" multiline rows={3} bind:value={draft} bind:ref={composer} placeholder="Message the room. @name calls a member." aria-label="Message" {onkeydown} />
        <Button data-testid="team-chat-send" disabled={!draft.trim()} onclick={() => void send()}><u>S</u>end</Button>
      </div>
    </div>
    <TaskPane class="side" testid="team-chat-side" aria-label="Team Chat tasks">
      <TaskPanel title="Members ({room?.members.length ?? 0})" special testid="team-chat-panel-members">
        <div class="members" data-testid="team-chat-members" role="list" aria-label="Members">
          {#each room?.members ?? [] as m (m.profileId)}
            {@const label = activityLabel(m.activity, m.queued)}
            {@const step = m.sessionId !== null && m.activity === 'thinking' ? host.agentStep(m.sessionId) : null}
            {@const followed = m.sessionId !== null && host.state.following?.sessionId === m.sessionId}
            <div class="member" role="listitem" data-testid="team-chat-member" data-activity={m.activity} data-member={m.name} data-session-id={m.sessionId ?? undefined} data-following={followed ? 'true' : undefined}>
              <button class="call" title="Call {m.name}" data-testid="team-chat-member-call" onclick={() => mention(m.name)}>
                <span class="avatar" class:away={m.activity === 'error'} style:background={m.color} aria-hidden="true">{initialOf(m.name)}</span>
                <span class="name">{m.name}</span>
                <span class="activity" class:busy={m.activity !== 'idle'} data-testid="team-chat-member-activity">({label ?? 'online'})</span>
              </button>
              {#if step}<span class="step" data-testid="team-chat-member-step" title="{m.name} is {step}">{step}</span>{/if}
              <span class="member-links">
                {#if isBusy(m)}
                  <TaskPaneLink testid="team-chat-member-stop" icon="stop" label="Stop" title="Stop {m.name} and drop the messages that wait for it" onclick={() => void host.api.rooms.stop(roomId, m.profileId)} />
                {/if}
                {#if m.sessionId !== null}
                  {@const sessionId = m.sessionId}
                  <TaskPaneLink testid="team-chat-member-follow" icon="session" label={followed ? 'Following' : 'Follow'} title={followed ? `Stop following ${m.name}.` : `Watch ${m.name} work: Code and the Terminal follow its steps and its cursor shows where it is.`} onclick={() => void host.follow(followed ? null : sessionId)} />
                  <TaskPaneLink testid="team-chat-member-session" icon="session" label={openMemberId === m.profileId ? 'Hide session' : 'Show session'} title="The full chat of {m.name}, with its tool calls" onclick={() => openSession(openMemberId === m.profileId ? null : m.profileId)} />
                {/if}
              </span>
            </div>
          {/each}
        </div>
      </TaskPanel>
      <TaskPanel title="I want to..." special testid="team-chat-panel-tasks">
        <div class="tasks">
          <TaskPaneLink testid="team-chat-task-call-all" icon="user" label="Call everyone in this room" onclick={() => mention('all')} />
          <TaskPaneLink testid="team-chat-task-stop-all" icon="stop" label="Stop every member" disabled={!anyBusy} onclick={stopAll} />
          <TaskPaneLink testid="team-chat-task-teams" icon="agent" label="Change the team in Teams" onclick={() => void host.openApp({ app: 'teams' })} />
        </div>
      </TaskPanel>
    </TaskPane>
    {#if openMember && openMember.sessionId !== null}
      <aside class="panel" data-testid="team-chat-session-panel" aria-label="Session of {openMember.name}">
        <EmbeddedChat {host} sessionId={openMember.sessionId} title={openMember.name} role="aside" collapsible={false} resizable contained />
      </aside>
    {/if}
  </div>
  <StatusStrip>
    <StatusStripLabel text={error || (calls.length ? `Calls: ${calls.join(', ')}` : lastReceivedLine(room?.messages ?? []) || (room?.room.cwd ?? ''))} />
  </StatusStrip>
  <ContextMenuStrip bind:open={ctx.open} x={ctx.x} y={ctx.y} items={ctx.items} label="Team Chat" />
  <AppAbout {help} />
</div>

<style>
  /* Windows Messenger 4.7 / 5.1 conversation window colours. */
  .room {
    --msn-band: #1a4cbe;
    --msn-frame: #c3d3f5;
    --msn-rule: #2c5ccd;
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--xp-window);
  }
  .row {
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .conv {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    background: var(--msn-band);
  }
  .to {
    flex: none;
    display: flex;
    gap: 8px;
    padding: 5px 10px 6px;
    color: #fff;
    font-weight: 700;
  }
  .to-label {
    flex: none;
  }
  .to-names {
    min-width: 0;
    color: #d8e4ff;
    overflow-wrap: anywhere;
  }
  .to-room {
    font-weight: 400;
  }
  .history {
    flex: 1;
    min-height: 0;
    display: flex;
    padding: 4px;
    background: var(--msn-frame);
  }
  .messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 12px;
    border: 1px solid #7f9db9;
    border-radius: 4px;
    background: #fff;
    font-size: 13px;
  }
  .msg {
    margin-bottom: 4px;
  }
  .says {
    color: #6e6e6e;
  }
  .text {
    padding-left: 22px;
    color: #000;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
  }
  .note {
    display: flex;
    gap: 5px;
    align-items: flex-start;
    margin: 8px 0 4px;
    color: #2e8b2e;
  }
  hr {
    width: 90px;
    margin: 4px 0 8px;
    border: 0;
    border-top: 1px solid #6e6e6e;
  }
  .formatbar {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    background: var(--msn-frame);
    border-bottom: 3px solid var(--msn-rule);
  }
  .composer {
    flex: none;
    display: flex;
    gap: 6px;
    align-items: stretch;
    padding: 4px;
    background: var(--msn-frame);
  }
  .composer :global(.xp-textbox) {
    flex: 1;
    min-width: 0;
  }
  .composer :global(button) {
    flex: none;
    width: 76px;
    height: auto;
  }
  .room :global(.side) {
    flex: none;
    width: 200px;
    height: auto;
    border-left: 1px solid var(--msn-band);
  }
  .members,
  .tasks {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .member {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .call {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 5px;
    padding: 0;
    border: 0;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: default;
  }
  .call:hover .name {
    color: var(--xp-taskpane-link-hot);
    text-decoration: underline;
  }
  .call:focus-visible {
    outline: 1px dotted #000;
  }
  .avatar {
    flex: none;
    width: 16px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
  }
  .avatar.away {
    opacity: 0.5;
  }
  .name {
    font-weight: 700;
    color: var(--xp-taskpane-link);
  }
  .activity {
    color: #555;
  }
  .activity.busy {
    color: #1e3287;
    font-style: italic;
  }
  .step {
    display: block;
    max-width: 300px;
    padding-left: 22px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #1e3287;
  }
  .member-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0 10px;
    padding-left: 21px;
  }
  .panel {
    flex: none;
    width: 340px;
    min-height: 0;
    display: flex;
    border-left: 1px solid var(--xp-group-border);
  }
</style>
