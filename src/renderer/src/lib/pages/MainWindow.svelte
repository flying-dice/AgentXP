<script lang="ts">
  import { onMount } from 'svelte'
  import type { Agent7Api } from '@shared/ipc'
  import { AppController } from '../app/AppController.svelte'
  import { buildMenus } from '../app/menus'
  import { connectionLabel, contextPercent } from '../app/sessionStatus'
  import { installShortcuts } from '../app/shortcuts'
  import SessionView from '../app/session/SessionView.svelte'
  import AboutDialog from '../app/shell/AboutDialog.svelte'
  import ChangesPane from '../app/shell/ChangesPane.svelte'
  import FileTree from '../app/shell/FileTree.svelte'
  import FileViewDialog from '../app/shell/FileViewDialog.svelte'
  import PropertiesPane from '../app/shell/PropertiesPane.svelte'
  import RenameDialog from '../app/shell/RenameDialog.svelte'
  import SessionTree from '../app/shell/SessionTree.svelte'
  import ShortcutsDialog from '../app/shell/ShortcutsDialog.svelte'
  import TasksPane from '../app/shell/TasksPane.svelte'
  import WelcomePanel from '../app/shell/WelcomePanel.svelte'
  import OptionsDialog from '../app/options/OptionsDialog.svelte'
  import ProgressBar from '../kit/atoms/ProgressBar.svelte'
  import Separator from '../kit/atoms/Separator.svelte'
  import StatusStripLabel from '../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../kit/molecules/ToolStripButton.svelte'
  import MenuStrip from '../kit/organisms/MenuStrip.svelte'
  import StatusStrip from '../kit/organisms/StatusStrip.svelte'
  import TabControl from '../kit/organisms/TabControl.svelte'
  import type { TabDef } from '../kit/organisms/TabControl'
  import ToolStrip from '../kit/organisms/ToolStrip.svelte'
  import MainWindowTemplate from '../kit/templates/MainWindowTemplate.svelte'
  import { UiStore } from '../stores/UiStore.svelte'

  interface Props {
    /** The backend; defaults to `window.agent7`. */
    api?: Agent7Api
    /** Layout state; defaults to the one persisted in localStorage. */
    ui?: UiStore
  }

  let { api = window.agent7, ui = new UiStore() }: Props = $props()

  // svelte-ignore state_referenced_locally
  const app = new AppController(api, ui)

  onMount(() => {
    void app.start()
    const uninstall = installShortcuts((command) => app.run(command))
    return () => {
      uninstall()
      app.dispose()
    }
  })

  $effect(() => ui.persistEffect())

  // The branch follows the active folder and is re-read whenever the session settles.
  $effect(() => {
    void app.session?.status
    void app.refreshBranch()
  })

  const menus = $derived(
    buildMenus(app.menuState, { run: (c) => app.run(c), setMode: (id) => void app.setMode(id), setModel: (id) => void app.setModel(id) })
  )

  const leftTabs: TabDef[] = [
    { id: 'sessions', title: 'Sessions' },
    { id: 'files', title: 'Files' }
  ]
  const rightTabs = $derived<TabDef[]>([
    { id: 'changes', title: app.changes.length > 0 ? `Changes (${app.changes.length})` : 'Changes' },
    { id: 'tasks', title: 'Tasks' },
    { id: 'properties', title: 'Properties' }
  ])

  const status = $derived(app.session?.status ?? null)
  const percent = $derived(contextPercent(app.session?.contextUsed ?? 0, app.session?.contextSize ?? 0))
  const modelName = $derived(
    app.session?.models.find((m) => m.id === app.session?.currentModelId)?.name ?? app.session?.currentModelId ?? app.agent?.name ?? ''
  )
  const statusText = $derived(app.activeStore?.error ?? app.ui.status)
  const changedPaths = $derived(app.changes.map((c) => c.path))
</script>

<MainWindowTemplate
  title={app.title}
  iconName="agent7"
  active={app.win.focused}
  windowState={app.win.maximized ? 'Maximized' : 'Normal'}
  bind:leftWidth={ui.leftWidth}
  bind:rightWidth={ui.rightWidth}
  onminimize={app.win.minimize}
  onmaximize={app.win.toggleMaximize}
  onrestore={app.win.toggleMaximize}
  onclose={app.win.close}
>
  {#snippet menu()}
    <MenuStrip {menus} />
  {/snippet}

  {#snippet toolbar()}
    <ToolStrip>
      <ToolStripButton icon="new" text="New session" onclick={() => app.run('session.new')} />
      <ToolStripButton icon="open-folder" text="Open folder" onclick={() => app.run('folder.open')} />
      <ToolStripButton icon="save" text="Save" disabled={!app.session} onclick={() => app.run('transcript.save')} />
      <Separator orientation="vertical" variant="toolbar" />
      <ToolStripButton icon="undo" text="Undo edit" disabled={!app.canUndo} onclick={() => app.run('edit.undo')} />
      <ToolStripButton icon="compact" text="Compact" disabled={!app.canCompact || app.busy} onclick={() => app.run('session.compact')} />
      <Separator orientation="vertical" variant="toolbar" />
      <ToolStripButton icon="stop" text="Stop" disabled={!app.busy} onclick={() => app.run('session.stop')} />
      {#snippet trailing()}
        <ToolStripButton icon="options" text="Options" onclick={() => app.run('tools.options')} />
      {/snippet}
    </ToolStrip>
  {/snippet}

  {#snippet left()}
    <TabControl tabs={leftTabs} bind:selected={ui.leftTab} aria-label="Explorer">
      {#snippet panel(tab)}
        {#if tab.id === 'sessions'}
          <SessionTree
            folders={app.folders.items}
            sessions={app.sessions.items}
            activeSessionId={ui.activeSessionId}
            bind:collapsed={ui.collapsed}
            onselectsession={(id) => app.select(id)}
            onselectfolder={(id) => (app.selectedFolderId = id)}
            onnewsession={(folderId) => void app.newSession(folderId)}
            onrename={(session) => (app.dialog = { kind: 'rename', session })}
            ondelete={(session) => void app.deleteSession(session)}
            onremovefolder={(folder) => void app.removeFolder(folder)}
          />
        {:else if app.folder}
          {#key app.folder.id}
            <FileTree
              rootName={app.folder.name}
              readDir={(path) => api.folders.readDir(app.folder!.id, path)}
              {changedPaths}
              onopen={(path) => void app.openFile(path)}
              onerror={(error) => app.reportError(error)}
            />
          {/key}
        {:else}
          <div class="hint">Select a session to browse the files of its folder.</div>
        {/if}
      {/snippet}
    </TabControl>
  {/snippet}

  {#snippet center()}
    {#if app.session && app.activeStore}
      {#key app.session.id}
        <SessionView store={app.activeStore} session={app.session} folder={app.folder} agent={app.agent} />
      {/key}
    {:else if app.loaded}
      <WelcomePanel
        hasFolders={app.folders.items.length > 0}
        onopenfolder={() => app.run('folder.open')}
        onnewsession={() => app.run('session.new')}
        onaddagent={() => app.showOptions('agents', true)}
      />
    {:else}
      <div class="blank"></div>
    {/if}
  {/snippet}

  {#snippet right()}
    <TabControl tabs={rightTabs} bind:selected={ui.rightTab} aria-label="Inspector">
      {#snippet panel(tab)}
        {#if tab.id === 'changes'}
          <ChangesPane
            changes={app.changes}
            bind:selectedId={app.selectedChangeId}
            onrevert={(change) => void app.revertChange(change)}
            onopeneditor={(change) => app.openInEditor(change)}
          />
        {:else if tab.id === 'tasks'}
          <TasksPane tasks={app.tasks} />
        {:else if app.session}
          <PropertiesPane
            session={app.session}
            folder={app.folder}
            agent={app.agent}
            ontitle={(title) => app.session && void app.renameSession(app.session, title)}
            onmode={(id) => void app.setMode(id)}
            onmodel={(id) => void app.setModel(id)}
          />
        {:else}
          <div class="hint">No session selected.</div>
        {/if}
      {/snippet}
    </TabControl>
  {/snippet}

  {#snippet statusbar()}
    <StatusStrip>
      <StatusStripLabel text={statusText} spring />
      {#if app.branch}<StatusStripLabel text="Branch: {app.branch}" borders={['left']} />{/if}
      {#if app.session}
        <StatusStripLabel text={modelName} borders={['left']} />
        <StatusStripLabel borders={['left']}>
          <span>Context</span>
          <ProgressBar width={90} value={percent} label="Context used" />
          <span class="pct">{percent}%</span>
        </StatusStripLabel>
      {/if}
      <StatusStripLabel text={connectionLabel(status)} borders={['left']} />
    </StatusStrip>
  {/snippet}

  {#snippet overlays()}
    {@const dialog = app.dialog}
    {#if dialog.kind === 'options'}
      <OptionsDialog agents={app.agents} initialTab={dialog.tab} addAgent={dialog.addAgent} onerror={(e) => app.reportError(e)} onclose={() => app.closeDialog()} />
    {:else if dialog.kind === 'about'}
      <AboutDialog version={app.version} onclose={() => app.closeDialog()} />
    {:else if dialog.kind === 'shortcuts'}
      <ShortcutsDialog onclose={() => app.closeDialog()} />
    {:else if dialog.kind === 'rename'}
      <RenameDialog value={dialog.session.title} onrename={(title) => void app.renameSession(dialog.session, title)} onclose={() => app.closeDialog()} />
    {/if}
    {#if app.fileView}
      <FileViewDialog path={app.fileView.path} text={app.fileView.text} error={app.fileView.error} onclose={() => app.closeFile()} />
    {/if}
  {/snippet}
</MainWindowTemplate>

<style>
  .hint {
    padding: 8px;
    color: var(--w7-text-muted);
  }
  .blank {
    flex: 1;
    background: var(--w7-window);
    border: 1px solid var(--w7-panel-border);
  }
  .pct {
    min-width: 30px;
    text-align: right;
  }
</style>
