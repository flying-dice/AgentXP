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
  import { errorText } from '../apps/shared/listing'
  import DesktopRow from '../launcher/DesktopRow.svelte'
  import NewDesktopDialog from '../launcher/NewDesktopDialog.svelte'
  import RenameDesktopDialog from '../launcher/RenameDesktopDialog.svelte'
  import { DELETE_WARNING, drivesLine, lastUsedText, sortDesktops, stateLabel } from '../launcher/launcherModel'

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
  let folders = $state.raw<FolderDto[]>([])
  let agents = $state.raw<AgentDto[]>([])

  const sorted = $derived(sortDesktops(desktops))
  const current = $derived(sorted.find((d) => d.id === selected) ?? null)

  function apply(next: DesktopSummaryDto[]): void {
    desktops = next
    if (selected === null || !next.some((d) => d.id === selected)) selected = sortDesktops(next)[0]?.id ?? null
  }

  onMount(() => {
    const off = api.on('launcher.changed', apply)
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
    return off
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

  async function connect(): Promise<void> {
    if (!current) return
    try {
      await api.launcher.connect(current.id)
    } catch (error) {
      await fail(error)
    }
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

  const browse = async (): Promise<FolderDto | null> => api.folders.pick()

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

<div class="page">
  <Form title="Agent7 Desktop Connection" iconName="agent7" dialog draggable width="100%" height="100%" onclose={() => void api.window.close()}>
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
        <p class="lead">Choose a desktop and click Connect. Closing a desktop window only disconnects; its agents keep running.</p>
        <div class="list w7-scroll" role="listbox" aria-label="Desktops" tabindex="0">
          {#each sorted as desktop (desktop.id)}
            <DesktopRow {desktop} {now} selected={desktop.id === selected} onselect={() => (selected = desktop.id)} onactivate={() => void connect()} />
          {:else}
            <p class="empty">{loaded ? "No desktops yet. Click New... to create one." : 'Loading...'}</p>
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
                <Button disabled={!current.connected} onclick={() => void disconnect()}>Disconnect</Button>
              </div>
            {:else}
              <p class="empty">Select a desktop to see its details.</p>
            {/if}
          </GroupBox>
        {/if}
      </div>
      <footer class="bar">
        <Button onclick={() => (options = !options)} aria-expanded={options}>
          <span class="arrow" aria-hidden="true">{options ? '▴' : '▾'}</span> {options ? 'Hide Options' : 'Show Options'}
        </Button>
        <span class="spring"></span>
        <Button onclick={() => (dialogOpen = 'new')}>New...</Button>
        <Button disabled={!current} onclick={() => (dialogOpen = 'rename')}>Rename...</Button>
        <Button disabled={!current} onclick={() => void remove()}>Delete...</Button>
        <Button isDefault disabled={!current} onclick={() => void connect()}>Connect</Button>
      </footer>
    </div>
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
