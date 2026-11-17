<script lang="ts">
  /** Teams: profiles (members with their own instructions, skills and tools), teams (groups of profiles) and the chat rooms of the desktop. */
  import { onMount } from 'svelte'
  import type { TeamsTab } from '@shared/desktop'
  import type { AgentDto } from '@shared/models'
  import type { ProfileInput, RoomDto, TeamInput } from '@shared/teams'
  import type { AppProps } from '../types'
  import Button from '../../kit/atoms/Button.svelte'
  import { reasonFor } from '../../kit/atoms/reason'
  import ReasonNote from '../../kit/atoms/ReasonNote.svelte'
  import { closeItems, menuBar } from '../../kit/molecules/standardMenu'
  import type { MenuDef } from '../../kit/molecules/MenuItem'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn } from '../../kit/organisms/ListView'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import { showFolderBrowser } from '../../kit/organisms/folderBrowser'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import TabControl from '../../kit/organisms/TabControl.svelte'
  import type { TabDef } from '../../kit/organisms/TabControl'
  import { TeamsStore } from '../../stores/TeamsStore.svelte'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import { useAppContext } from '../shared/appContext.svelte'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import ProfileDialog from './ProfileDialog.svelte'
  import type { BoardDto } from '@shared/kanban'
  import TeamDialog from './TeamDialog.svelte'
  import { formFromProfile, formFromTeam, profileRows, roomRows, teamRows } from './teamForms'

  let { window: win, host }: AppProps<'teams'> = $props()

  // svelte-ignore state_referenced_locally
  const store = new TeamsStore(host.api)
  let agents = $state.raw<AgentDto[]>([])
  let rooms = $state.raw<RoomDto[]>([])
  // svelte-ignore state_referenced_locally
  let tab = $state<TeamsTab>(win.view.tab ?? 'teams')
  let selected = $state<Record<TeamsTab, string[]>>({ teams: [], profiles: [], rooms: [] })
  let editingTeam = $state<{ id: number | null } | null>(null)
  let editingProfile = $state<{ id: number | null } | null>(null)

  const tabs: TabDef[] = [
    { id: 'teams', title: 'Teams', icon: 'user', testid: 'teams-tab-teams' },
    { id: 'profiles', title: 'Profiles', icon: 'agent', testid: 'teams-tab-profiles' },
    { id: 'rooms', title: 'Chat rooms', icon: 'session', testid: 'teams-tab-rooms' }
  ]
  const columns: Record<TeamsTab, ListColumn[]> = {
    teams: [
      { key: 'name', header: 'Team', width: 150 },
      { key: 'members', header: 'Members' },
      { key: 'skills', header: 'Skills', width: 56 }
    ],
    profiles: [
      { key: 'name', header: 'Profile', width: 130 },
      { key: 'about', header: 'Instructions' },
      { key: 'teams', header: 'Teams', width: 150 }
    ],
    rooms: [
      { key: 'title', header: 'Room' },
      { key: 'team', header: 'Team', width: 150 },
      { key: 'created', header: 'Started', width: 130 }
    ]
  }
  const rows = $derived({ teams: teamRows(store.teams, store.profiles), profiles: profileRows(store.profiles, store.teams), rooms: roomRows(rooms, store.teams) })
  const pickedId = $derived(selected[tab][0] === undefined ? null : Number(selected[tab][0]))
  const team = $derived(store.teams.find((t) => t.id === pickedId) ?? null)
  const profile = $derived(store.profiles.find((p) => p.id === pickedId) ?? null)
  const room = $derived(rooms.find((r) => r.id === pickedId) ?? null)

  async function guard(action: () => Promise<unknown>): Promise<void> {
    try {
      await action()
    } catch (error) {
      await showMessageBox({ text: error instanceof Error ? error.message : String(error), caption: 'Teams', buttons: 'OK', icon: 'error' })
    }
  }

  let boards = $state<BoardDto[]>([])
  const loadBoards = async (): Promise<void> => void (boards = await host.api.kanban.list(host.state.desktopId).catch(() => []))
  const loadRooms = async (): Promise<void> => void (rooms = await host.api.rooms.list(host.state.desktopId))

  onMount(() => {
    void guard(async () => {
      await store.load()
      await loadRooms()
      await loadBoards()
      agents = await host.api.agents.list()
    })
    const off = host.api.on('room.changed', () => void loadRooms())
    const gone = host.api.on('room.removed', () => void loadRooms())
    const boardsOff = host.api.on('kanban.changed', () => void loadBoards())
    return () => {
      off()
      boardsOff()
      gone()
    }
  })

  function choose(next: string): void {
    tab = next as TeamsTab
    host.updateView(win.id, { app: 'teams', tab, selectedId: null })
  }

  async function saveTeam(input: TeamInput): Promise<void> {
    const target = editingTeam?.id ?? null
    await guard(async () => {
      const saved = await store.change(() => (target === null ? host.api.teams.create(input) : host.api.teams.update(target, input)))
      selected.teams = [String(saved.id)]
    })
  }

  async function saveProfile(input: ProfileInput): Promise<void> {
    const target = editingProfile?.id ?? null
    await guard(async () => {
      const saved = await store.change(() => (target === null ? host.api.profiles.create(input) : host.api.profiles.update(target, input)))
      selected.profiles = [String(saved.id)]
    })
  }

  async function removeSelected(): Promise<void> {
    const name = tab === 'teams' ? team?.name : tab === 'profiles' ? profile?.name : room?.title
    if (!name || pickedId === null) return
    const what = tab === 'teams' ? 'team' : tab === 'profiles' ? 'profile' : 'chat room'
    const answer = await showMessageBox({ text: `Delete the ${what} "${name}"?`, caption: 'Teams', buttons: 'YesNo', icon: 'warning' })
    if (answer !== 'yes') return
    const id = pickedId
    await guard(async () => {
      if (tab === 'teams') await store.change(() => host.api.teams.remove(id))
      else if (tab === 'profiles') await store.change(() => host.api.profiles.remove(id))
      else await host.api.rooms.remove(id)
      await loadRooms()
    })
  }

  /** Starts a chat room for the team: the folder the members work in is asked first, then the room opens in its own window. */
  async function startRoom(): Promise<void> {
    const target = team
    if (!target) return
    const path = await showFolderBrowser({ purpose: 'team-room', source: host.api.fs }).catch(() => null)
    await guard(async () => {
      let cwd: string | undefined
      if (path) {
        const folder = await host.api.folders.add(path)
        const plugged = host.state.drives.find((d) => d.folderId === folder.id) ?? (await host.api.drives.plugIn(host.state.desktopId, folder.id))
        if (plugged) cwd = `${plugged.letter}:\\`
      }
      const created = await host.api.rooms.create(host.state.desktopId, target.id, cwd)
      await loadRooms()
      await host.openApp({ app: 'team-chat', roomId: created.id })
    })
  }

  const openRoom = (): Promise<unknown> | void => (room ? host.openApp({ app: 'team-chat', roomId: room.id }) : undefined)

  function edit(): void {
    if (tab === 'teams' && team) editingTeam = { id: team.id }
    else if (tab === 'profiles' && profile) editingProfile = { id: profile.id }
    else if (tab === 'rooms') void openRoom()
  }

  const add = (): void => void (tab === 'profiles' ? (editingProfile = { id: null }) : (editingTeam = { id: null }))

  const noneSelected = $derived(pickedId === null || (tab === 'teams' && !team) || (tab === 'profiles' && !profile) || (tab === 'rooms' && !room) ? `Select a ${tab === 'teams' ? 'team' : tab === 'profiles' ? 'profile' : 'chat room'} first` : null)
  const roomReason = $derived(!team ? 'Select a team first' : team.memberIds.length === 0 ? 'Add a member to the team first' : null)

  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'teams')
  const ctx = new ContextMenu()
  const items = () => [
    ...(tab === 'rooms' ? [] : [{ id: 'teams-ctx-new', testid: 'teams-ctx-new', label: tab === 'profiles' ? 'New profile...' : 'New team...', action: add }]),
    ...(noneSelected ? [] : [{ id: 'teams-ctx-edit', testid: 'teams-ctx-edit', label: tab === 'rooms' ? 'Open' : 'Edit...', action: edit }, { id: 'teams-ctx-delete', testid: 'teams-ctx-delete', label: 'Delete', action: () => void removeSelected() }])
  ]
  // svelte-ignore state_referenced_locally
  useAppContext(host, () => win.id, () => ({ tab, teams: store.teams.map((t) => t.name), profiles: store.profiles.map((p) => p.name) }))

  const menus = $derived<MenuDef[]>(
    menuBar([
      { label: '&File', items: [{ id: 'teams-new-team', testid: 'teams-menu-new-team', label: 'New &team...', action: () => (editingTeam = { id: null }) }, { id: 'teams-new-profile', testid: 'teams-menu-new-profile', label: 'New &profile...', action: () => (editingProfile = { id: null }) }, { separator: true }, ...closeItems('teams', () => void host.closeWindow(win.id)).slice(1)] },
      { label: '&View', items: tabs.map((t) => ({ id: `teams-view-${t.id}`, testid: `teams-menu-view-${t.id}`, label: t.title, radio: true, checked: t.id === tab, action: () => choose(t.id) })) },
      help.menu()
    ])
  )
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="teams" data-testid="teams-app" oncontextmenu={(e) => ctx.show(e, items())} onkeydown={(e) => ctx.key(e, items)}>
  <MenuStrip {menus} aria-label="Teams menu" />
  <div class="body">
    <p class="lead">
      {#if tab === 'teams'}A team is a group of profiles with instructions and skills every member gets. Start a chat room to work with it.{:else if tab === 'profiles'}A profile is one member: its instructions (the role lives there), agent, model, skills and tools.{:else}Chat rooms of this desktop. Close a room window and open it again here.{/if}
    </p>
    <TabControl {tabs} selected={tab} onchange={choose} aria-label="Teams">
      {#snippet panel(t)}
        <div class="page">
          <div class="list">
            <ListView
              columns={columns[t.id as TeamsTab]}
              rows={rows[t.id as TeamsTab]}
              bind:selected={selected[t.id as TeamsTab]}
              aria-label={t.title}
              testid="teams-list"
              rowTestid="teams-row"
              emptyText={t.id === 'teams' ? 'No teams yet. Choose New... to make one.' : t.id === 'profiles' ? 'No profiles yet. Choose New... to make one.' : 'No chat rooms yet. Select a team and choose Start chat room.'}
              onactivate={edit}
            />
          </div>
          <div class="side">
            {#if t.id !== 'rooms'}<Button data-testid="teams-new" onclick={add}>New...</Button>{/if}
            {#if t.id === 'rooms'}
              <Button data-testid="teams-open-room" {...reasonFor(noneSelected)} onclick={() => void openRoom()}>Open</Button>
            {:else}
              <Button data-testid="teams-edit" {...reasonFor(noneSelected)} onclick={edit}>Edit...</Button>
            {/if}
            <Button data-testid="teams-delete" {...reasonFor(noneSelected)} onclick={() => void removeSelected()}>Delete</Button>
            {#if t.id === 'teams'}<Button data-testid="teams-start-room" {...reasonFor(roomReason)} onclick={() => void startRoom()}>Start chat room...</Button>{/if}
            <ReasonNote testid="teams-reason" reason={t.id === 'teams' ? (noneSelected ?? roomReason) : noneSelected} />
          </div>
        </div>
      {/snippet}
    </TabControl>
  </div>
  <ContextMenuStrip bind:open={ctx.open} x={ctx.x} y={ctx.y} items={ctx.items} label="Teams" />
  <AppAbout {help} />
  {#if editingTeam}
    {@const target = store.teams.find((t) => t.id === editingTeam?.id)}
    <TeamDialog title={target ? 'Edit Team' : 'New Team'} initial={target ? formFromTeam(target) : undefined} profiles={store.profiles} skills={store.skills} {boards} contained onsubmit={(input) => void saveTeam(input)} onclose={() => (editingTeam = null)} />
  {/if}
  {#if editingProfile}
    {@const target = store.profiles.find((p) => p.id === editingProfile?.id)}
    <ProfileDialog title={target ? 'Edit Profile' : 'New Profile'} initial={target ? formFromProfile(target) : undefined} {agents} skills={store.skills} servers={store.servers} contained onsubmit={(input) => void saveProfile(input)} onclose={() => (editingProfile = null)} />
  {/if}
</div>

<style>
  .teams {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-window);
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 10px 12px 12px;
  }
  .lead {
    margin: 0 0 8px;
  }
  .page {
    height: 100%;
    display: flex;
    gap: 8px;
    padding: 8px;
  }
  .list {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .list :global(.w7-listview) {
    flex: 1;
    min-height: 0;
  }
  .side {
    flex: none;
    width: 150px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .side :global(.w7-reason) {
    white-space: normal;
    min-height: 2.6em;
  }
  .body :global(.w7-tabcontrol) {
    flex: 1;
    min-height: 0;
  }
</style>
