<script lang="ts">
  /**
   * The launcher window: "Agent7 Desktop Connection", styled after Windows 7's Remote Desktop
   * Connection. Lists the desktops (long-lived projects); Connect opens one in its own OS window,
   * and closing that window only disconnects.
   */
  import { onMount, untrack } from 'svelte'
  import type { Agent7Api } from '@shared/ipc'
  import type { AgentDto, FolderDto } from '@shared/models'
  import type { DesktopSummaryDto, NewDesktopInput } from '@shared/vfs'
  import Button from '../kit/atoms/Button.svelte'
  import GroupBox from '../kit/atoms/GroupBox.svelte'
  import Icon from '../kit/atoms/Icon.svelte'
  import Form from '../kit/organisms/Form.svelte'
  import { showMessageBox } from '../kit/organisms/messageBox'
  import { formatDateTime } from '../apps/shared/dates'
  import { chooseFolder } from '../apps/shared/chooseFolder'
  import { errorText } from '../apps/shared/listing'
  import { parseMnemonic } from '../kit/molecules/MenuItem'
  import DesktopRow from '../launcher/DesktopRow.svelte'
  import LauncherHelpDialog from '../launcher/LauncherHelpDialog.svelte'
  import NewDesktopDialog from '../launcher/NewDesktopDialog.svelte'
  import RenameDesktopDialog from '../launcher/RenameDesktopDialog.svelte'
  import { accessKeyCommand, AGENT_CHECK_MS, connectLabel, connectTip, EMPTY_LAUNCHER_HELP, LAUNCHER_WINDOW_TITLE, DELETE_WARNING, drivesLine, initialSelection, lastUsedText, sortDesktops, stateLabel } from '../launcher/launcherModel'

  interface Props {
    /** The backend; defaults to `window.agent7`. */
    api?: Agent7Api
    /** Clock for "last used" (stories pass a fixed one). */
    now?: Date
    /** Open the "Show Options" details at start (stories). */
    showOptions?: boolean
    /** Dialog shown at start (stories). */
    dialog?: 'new' | 'rename' | null
    /** Pre-selected desktop id (stories). */
    selectedId?: number | null
  }

  let { api = window.agent7, now, showOptions = false, dialog = null, selectedId = null }: Props = $props()

  let desktops = $state.raw<DesktopSummaryDto[]>([])
  let loaded = $state(false)
  // svelte-ignore state_referenced_locally
  let selected = $state<number | null>(selectedId)
  // svelte-ignore state_referenced_locally
  let options = $state(showOptions)
  // svelte-ignore state_referenced_locally
  let dialogOpen = $state<'new' | 'rename' | null>(dialog)
  let helpOpen = $state(false)
  /** Desktops that Connect was pressed for and whose window is not up yet. */
  let opening = $state<number[]>([])
  /** Desktops just created whose window did not open: the row says to click Connect. */
  let ready = $state<number[]>([])
  let folders = $state.raw<FolderDto[]>([])
  let agents = $state.raw<AgentDto[]>([])

  const sorted = $derived(sortDesktops(desktops))
  const current = $derived(sorted.find((d) => d.id === selected) ?? null)

  /** Looks for the agent program of each desktop (nothing is started). Quiet when it fails. */
  const checkAgents = (): void => void api.launcher.checkAgents().catch(() => {})
  /** The desktops that exist, by id and name: a change means one was created, renamed or removed. */
  const listKey = (list: readonly DesktopSummaryDto[]): string => list.map((d) => `${d.id}:${d.title}`).join('|')

  function apply(next: DesktopSummaryDto[]): void {
    const changed = loaded && listKey(next) !== listKey(desktops)
    desktops = next
    if (changed) checkAgents()
    // Nothing selected yet (or the selected desktop is gone): a desktop that waits for approval, else the most recent one.
    if (selected === null || !next.some((d) => d.id === selected)) selected = initialSelection(next)
  }

  onMount(() => {
    document.title = LAUNCHER_WINDOW_TITLE
    const off = api.on('launcher.changed', apply)
    // Is the agent program of each desktop there? Looked up when the launcher opens, when the list changes, when the window
    // gets focus and every 30 seconds while it is open.
    checkAgents()
    const timer = setInterval(checkAgents, AGENT_CHECK_MS)
    window.addEventListener('focus', checkAgents)
    void api.launcher.list().then(
      (items) => {
        apply(items)
        loaded = true
      },
      (error: unknown) => {
        loaded = true
        void fail(error)
      }
    )
    return () => {
      off()
      clearInterval(timer)
      window.removeEventListener('focus', checkAgents)
    }
  })

  // The New dialog needs the project folders and the agents.
  $effect(() => {
    if (dialogOpen !== 'new') return
    untrack(() => {
      void Promise.all([api.folders.list(), api.agents.list()]).then(([f, a]) => {
        folders = f
        agents = a
      })
    })
  })

  async function fail(error: unknown): Promise<void> {
    await showMessageBox({ text: errorText(error), caption: 'Agent7 Desktop Connection', buttons: 'OK', icon: 'error' })
  }

  /** Opens the desktop's window; false when it failed (the user has been told). */
  async function openDesktop(target: DesktopSummaryDto): Promise<boolean> {
    // A connected desktop is only brought to the front ("Show desktop").
    if (!target.connected) opening = [...opening, target.id]
    try {
      await api.launcher.connect(target.id)
      ready = ready.filter((id) => id !== target.id)
      return true
    } catch (error) {
      await fail(error)
      return false
    } finally {
      opening = opening.filter((id) => id !== target.id)
    }
  }

  async function connect(): Promise<void> {
    if (current) await openDesktop(current)
  }

  async function disconnect(): Promise<void> {
    if (!current) return
    try {
      await api.launcher.disconnect(current.id)
    } catch (error) {
      await fail(error)
    }
  }

  async function create(input: NewDesktopInput): Promise<void> {
    dialogOpen = null
    try {
      const created = await api.launcher.create(input)
      selected = created.id
      // The new desktop opens at once; when that fails the row says to click Connect.
      ready = [...ready, created.id]
      await openDesktop(created)
    } catch (error) {
      await fail(error)
    }
  }

  async function rename(title: string): Promise<void> {
    dialogOpen = null
    if (!current) return
    try {
      await api.launcher.rename(current.id, title)
    } catch (error) {
      await fail(error)
    }
  }

  async function remove(): Promise<void> {
    const target = current
    if (!target) return
    const answer = await showMessageBox({
      text: `Delete the desktop '${target.title}'?\n\n${DELETE_WARNING}`,
      caption: 'Agent7 Desktop Connection',
      buttons: 'YesNo',
      icon: 'warning',
      defaultButton: 1
    })
    if (answer !== 'yes') return
    try {
      await api.launcher.remove(target.id)
    } catch (error) {
      await fail(error)
    }
  }

  async function browse(): Promise<FolderDto | null> {
    try {
      return await chooseFolder(api, 'desktop')
    } catch (error) {
      await fail(error)
      return null
    }
  }

  const COMMANDS = {
    new: () => (dialogOpen = 'new'),
    connect: () => void connect(),
    rename: () => current && (dialogOpen = 'rename'),
    delete: () => void remove()
  } as const

  /** F1 opens Help; Alt+N, Alt+C, Alt+R and Alt+D press the buttons. */
  function onWindowKeydown(event: KeyboardEvent): void {
    if (event.key === 'F1') {
      event.preventDefault()
      helpOpen = true
      return
    }
    if (dialogOpen || helpOpen || !event.altKey || event.ctrlKey || event.metaKey) return
    const command = accessKeyCommand(event.key)
    if (!command || ((command === 'rename' || command === 'delete' || command === 'connect') && !current)) return
    event.preventDefault()
    COMMANDS[command]()
  }

  function onKeydown(event: KeyboardEvent): void {
    if (dialogOpen) return
    const at = sorted.findIndex((d) => d.id === selected)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const next = sorted[Math.max(0, Math.min(sorted.length - 1, at + (event.key === 'ArrowDown' ? 1 : -1)))]
      if (next) selected = next.id
    } else if (event.key === 'Delete' && current) {
      event.preventDefault()
      void remove()
    } else if (event.key === 'F2' && current) {
      event.preventDefault()
      dialogOpen = 'rename'
    }
  }

  const usbDrives = $derived(current?.drives ?? [])
</script>

<!-- The browser's own context menu never shows. -->
<svelte:window oncontextmenu={(e) => e.preventDefault()} onkeydown={onWindowKeydown} />

{#snippet access(label: string)}
  {@const parts = parseMnemonic(label)}
  {parts.before}{#if parts.key}<u>{parts.key}</u>{/if}{parts.after}
{/snippet}

<div class="page">
  <Form testid="launcher-window" title="Agent7 Desktop Connection" iconName="agent7" dialog draggable width="100%" height="100%" onclose={() => void api.window.close()}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="rdc" role="presentation" onkeydown={onKeydown}>
      <header class="banner">
        <span class="monitor" aria-hidden="true"><Icon name="computer" size={48} /></span>
        <span class="words">
          <span class="small">Agent7</span>
          <span class="big">Desktop<br />Connection</span>
        </span>
        <span class="mark" aria-hidden="true"><Icon name="agent7" size={44} /></span>
      </header>
      <div class="body">
        <p class="lead">Closing a desktop window only disconnects it. Its agents keep running.</p>
        <!-- A listbox needs option children: with no desktops the list is plain. -->
        <div class="list w7-scroll" role={sorted.length > 0 ? 'listbox' : undefined} data-testid="launcher-list" aria-label={sorted.length > 0 ? 'Desktops' : undefined} tabindex="0">
          {#each sorted as desktop (desktop.id)}
            <DesktopRow {desktop} {now} opening={opening.includes(desktop.id)} ready={ready.includes(desktop.id)} selected={desktop.id === selected} onselect={() => (selected = desktop.id)} onactivate={() => void connect()} />
          {:else}
            <p class="empty" data-testid="launcher-empty">{loaded ? 'No desktops yet. A desktop is a workspace where an agent works on your projects. Click New... to create one.' : 'Loading...'}</p>
            {#if loaded}<p class="empty" data-testid="launcher-empty-help">{EMPTY_LAUNCHER_HELP}</p>{/if}
          {/each}
        </div>
        {#if options}
          <GroupBox text="Desktop details" class="details">
            {#if current}
              <dl>
                <dt>Name</dt><dd>{current.title}</dd>
                <dt>Status</dt><dd>{stateLabel(current)}{current.connected ? ', connected' : ', not connected'}</dd>
                <dt>Chats</dt><dd>{current.chatCount}</dd>
                <dt>Drives</dt>
                <dd>
                  {#each usbDrives as drive (drive.letter)}<span class="drive"><Icon name={drive.kind === 'removable' ? 'usb' : 'drive'} />{drive.letter}: {drive.label}</span>{/each}
                </dd>
                <dt>Projects</dt><dd>{drivesLine(current.drives)}</dd>
                <dt>Created</dt><dd>{formatDateTime(current.createdAt)}</dd>
                <dt>Last used</dt><dd>{lastUsedText(current.lastUsedAt, now)}</dd>
              </dl>
              <div class="more">
                <Button data-testid="launcher-disconnect" disabled={!current.connected} onclick={() => void disconnect()}>Disconnect</Button>
              </div>
            {:else}
              <p class="empty">Select a desktop to see its details.</p>
            {/if}
          </GroupBox>
        {/if}
      </div>
      <footer class="bar">
        <Button data-testid="launcher-options" onclick={() => (options = !options)} aria-expanded={options}>
          <span class="arrow" aria-hidden="true">{options ? '▴' : '▾'}</span> {options ? 'Hide Options' : 'Show Options'}
        </Button>
        <span class="spring"></span>
        <Button data-testid="launcher-new" title="Create a new desktop (Alt+N)" aria-keyshortcuts="Alt+N" onclick={COMMANDS.new}>{@render access('&New...')}</Button>
        <Button data-testid="launcher-rename" title="Rename the selected desktop (Alt+R)" aria-keyshortcuts="Alt+R" disabled={!current} onclick={() => COMMANDS.rename()}>{@render access('&Rename...')}</Button>
        <Button data-testid="launcher-delete" title="Delete the selected desktop (Alt+D)" aria-keyshortcuts="Alt+D" disabled={!current} onclick={COMMANDS.delete}>{@render access('&Delete...')}</Button>
        <Button data-testid="launcher-connect" title={connectTip(current?.connected ?? false)} aria-keyshortcuts="Alt+C" isDefault disabled={!current} onclick={COMMANDS.connect}>{@render access(connectLabel(current?.connected ?? false))}</Button>
      </footer>
    </div>
    {#if helpOpen}
      <LauncherHelpDialog onclose={() => (helpOpen = false)} />
    {/if}
    {#if dialogOpen === 'new'}
      <NewDesktopDialog {folders} {agents} existingNames={desktops.map((d) => d.title)} onbrowse={browse} oncreate={(i) => void create(i)} oncancel={() => (dialogOpen = null)} />
    {:else if dialogOpen === 'rename' && current}
      <RenameDesktopDialog title={current.title} existingNames={desktops.filter((d) => d.id !== current?.id).map((d) => d.title)} onrename={(t) => void rename(t)} oncancel={() => (dialogOpen = null)} />
    {/if}
  </Form>
</div>

<style>
  .page {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--w7-desktop-bg);
    padding: 0;
    box-sizing: border-box;
  }
  .rdc {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .banner {
    flex: none;
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    height: 70px;
    padding: 0 16px;
    overflow: hidden;
    background:
      radial-gradient(ellipse at 88% 20%, rgba(255, 255, 255, 0.85) 0, rgba(255, 255, 255, 0) 55%),
      linear-gradient(100deg, #ffffff 0, #dbe9f9 35%, #8fbbea 78%, #5d9be0 100%);
    border-bottom: 1px solid #7e9cc4;
  }
  .words {
    display: flex;
    flex-direction: column;
    line-height: 1;
    color: #1b3a6b;
  }
  .small {
    font-size: 13px;
    letter-spacing: 0.4px;
  }
  .big {
    font: 300 22px/22px 'Segoe UI Light', 'Segoe UI', 'Noto Sans', sans-serif;
    margin-top: 2px;
  }
  .monitor {
    filter: drop-shadow(1px 2px 2px rgba(20, 50, 100, 0.35));
  }
  .mark {
    margin-left: auto;
    filter: drop-shadow(1px 2px 3px rgba(20, 50, 100, 0.4));
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 14px 4px;
  }
  .lead {
    margin: 0;
    color: #1e3287;
  }
  .list {
    flex: 1;
    min-height: 90px;
    overflow: auto;
    padding: 2px;
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
    outline: 0;
  }
  .list:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: -3px;
  }
  .empty {
    margin: 14px 10px;
    color: var(--w7-text-muted);
  }
  :global(.details) {
    flex: none;
  }
  dl {
    display: grid;
    grid-template-columns: 76px 1fr;
    gap: 2px 8px;
    margin: 0;
  }
  dt {
    color: var(--w7-text-muted);
  }
  dd {
    margin: 0;
    min-width: 0;
  }
  .drive {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-right: 12px;
  }
  .more {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
  }
  .bar {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 14px 12px;
  }
  .spring {
    flex: 1;
  }
  .arrow {
    font-size: 10px;
  }
</style>
