<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import type { SchedulerTab } from '@shared/desktop'
  import type { AgentDto, Id, SessionDto } from '@shared/models'
  import type { TriggerDto } from '@shared/schedule'
  import { taskProblem, type AgentActionDto, type ScheduledTaskDto, type ScheduledTaskInput, type TaskRunDto } from '@shared/scheduler'
  import type { AppProps } from '../types'
  import Icon from '../../kit/atoms/Icon.svelte'
  import type { IconName } from '../../kit/atoms/icons'
  import type { MenuDef, MenuItemDef } from '../../kit/molecules/MenuItem'
  import { closeItems, menuBar } from '../../kit/molecules/standardMenu'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import ListView from '../../kit/organisms/ListView.svelte'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import SplitContainer from '../../kit/organisms/SplitContainer.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import TreeView from '../../kit/organisms/TreeView.svelte'
  import type { TreeNodeData } from '../../kit/organisms/TreeView'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import { useAppContext } from '../shared/appContext.svelte'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import ActionDialog from './ActionDialog.svelte'
  import BasicTaskWizard from './BasicTaskWizard.svelte'
  import TaskDetail from './TaskDetail.svelte'
  import TaskEditorDialog from './TaskEditorDialog.svelte'
  import TriggerDialog from './TriggerDialog.svelte'
  import { blankTask, commandsFor, countText, defaultProject, inputOf, LIBRARY_COLUMNS, overview, statusText, taskRows } from './taskModel'

  let { window: win, host }: AppProps<'task-scheduler'> = $props()

  const LIBRARY = 'library'
  const ROOT = 'root'

  let tasks = $state.raw<ScheduledTaskDto[]>([])
  let agents = $state.raw<AgentDto[]>([])
  let sessions = $state.raw<SessionDto[]>([])
  let runs = $state.raw<TaskRunDto[]>([])
  let node = $state<string | null>(LIBRARY)
  let expanded = $state(new Set<string>([ROOT]))
  // svelte-ignore state_referenced_locally
  let selected = $state<string[]>(win.view.selectedTaskId !== null ? [String(win.view.selectedTaskId)] : [])
  // svelte-ignore state_referenced_locally
  let tab = $state<SchedulerTab>(win.view.tab)
  let error = $state<string | null>(null)
  let wizard = $state(false)
  let editor = $state<{ taskId: Id | null; draft: ScheduledTaskInput; tab: string; problem: string } | null>(null)
  let triggerEdit = $state<{ index: number | null } | null>(null)
  let actionEdit = $state<{ index: number | null } | null>(null)

  const desktopId = $derived(host.state.desktopId)
  const drives = $derived(host.state.drives)
  const current = $derived(tasks.find((t) => String(t.id) === selected[0]) ?? null)
  const commands = $derived(commandsFor(current))
  const rows = $derived(taskRows(tasks))
  const summary = $derived(overview(tasks))
  const ctx = $derived({ agents, drives, sessions })
  const nodes: TreeNodeData[] = [
    {
      id: ROOT,
      testid: 'task-scheduler-node-root',
      text: 'Task Scheduler (Local)',
      icon: 'scheduler',
      expanded: true,
      children: [{ id: LIBRARY, testid: 'task-scheduler-node-library', text: 'Task Scheduler Library', icon: 'folder' }]
    }
  ]

  // ---- load and follow -----------------------------------------------------------------------------

  async function refresh(): Promise<void> {
    try {
      const [list, agentList, sessionList] = await Promise.all([host.api.scheduler.list(desktopId), host.api.agents.list(), host.api.sessions.list(desktopId)])
      tasks = list
      agents = agentList
      sessions = sessionList
      error = null
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }

  onMount(() => {
    void refresh()
    return host.api.on('scheduler.changed', (change) => {
      if (change.desktopId === desktopId) tasks = change.tasks
    })
  })

  // The history of the selected task: reloaded when the task changes or one of its runs starts or ends.
  const runKey = $derived(current ? `${current.id}:${current.lastRun?.id ?? 0}:${current.lastRun?.result ?? ''}:${current.status}` : '')
  $effect(() => {
    const id = current?.id ?? null
    void runKey
    if (id === null) {
      runs = []
      return
    }
    let stale = false
    void host.api.scheduler.history(id).then((list) => {
      if (!stale) runs = list
    })
    return () => (stale = true)
  })

  // A task that was deleted leaves the selection.
  $effect(() => {
    if (selected.length > 0 && tasks.length >= 0 && !current && tasks.length > 0) untrack(() => (selected = []))
  })

  function report(): void {
    const selectedTaskId = current?.id ?? null
    if (win.view.selectedTaskId !== selectedTaskId || win.view.tab !== tab) host.updateView(win.id, { app: 'task-scheduler', selectedTaskId, tab })
  }
  $effect(() => {
    void [current?.id, tab]
    untrack(report)
  })

  // svelte-ignore state_referenced_locally
  useAppContext(host, () => win.id, () => ({
    tasks: tasks.length,
    selectedTask: current ? { id: current.id, name: current.name, status: current.status, enabled: current.enabled, triggers: current.triggers.length, lastResult: current.lastRun?.result ?? null } : null
  }))

  // ---- commands -------------------------------------------------------------------------------------

  async function attempt(work: () => Promise<unknown>): Promise<void> {
    try {
      await work()
    } catch (e) {
      await showMessageBox({ text: e instanceof Error ? e.message : String(e), caption: 'Task Scheduler', buttons: 'OK', icon: 'error' })
    }
  }

  const run = (): Promise<void> => attempt(async () => current && host.api.scheduler.run(current.id))
  const end = (): Promise<void> => attempt(async () => current && host.api.scheduler.end(current.id))
  const toggle = (): Promise<void> => attempt(async () => current && host.api.scheduler.setEnabled(current.id, !current.enabled))

  async function remove(): Promise<void> {
    const task = current
    if (!task) return
    const answer = await showMessageBox({ text: `Do you want to delete the task "${task.name}"? Its history is deleted with it.`, caption: 'Task Scheduler', buttons: 'YesNo', icon: 'warning' })
    if (answer === 'yes') await attempt(() => host.api.scheduler.remove(task.id))
  }

  async function clearHistory(): Promise<void> {
    const task = current
    if (task) await attempt(() => host.api.scheduler.clearHistory(task.id))
  }

  const openChat = (sessionId: number): void => void host.openApp({ app: 'chat', sessionId })

  // ---- Create Task and Properties -------------------------------------------------------------------

  async function openEditor(task: ScheduledTaskDto | null): Promise<void> {
    sessions = await host.api.sessions.list(desktopId).catch(() => sessions)
    editor = { taskId: task?.id ?? null, draft: task ? inputOf(task) : blankTask(defaultProject(drives)), tab: 'general', problem: '' }
  }

  async function finishEditor(result: 'ok' | 'cancel'): Promise<void> {
    const open = editor
    if (!open) return
    if (result === 'cancel') {
      editor = null
      return
    }
    const input = $state.snapshot(open.draft) as ScheduledTaskInput
    const text = taskProblem(input)
    if (text) {
      open.problem = text
      return
    }
    try {
      const saved = open.taskId === null ? await host.api.scheduler.create(desktopId, input) : await host.api.scheduler.update(open.taskId, input)
      editor = null
      node = LIBRARY
      selected = [String(saved.id)]
      await refresh()
    } catch (e) {
      open.problem = e instanceof Error ? e.message : String(e)
    }
  }

  function saveTrigger(trigger: TriggerDto): void {
    if (!editor || !triggerEdit) return
    const index = triggerEdit.index
    editor.draft.triggers = index === null ? [...editor.draft.triggers, trigger] : editor.draft.triggers.map((t, i) => (i === index ? trigger : t))
    editor.problem = ''
    triggerEdit = null
  }

  function saveAction(action: AgentActionDto): void {
    if (!editor || !actionEdit) return
    const index = actionEdit.index
    editor.draft.actions = index === null ? [...editor.draft.actions, action] : editor.draft.actions.map((a, i) => (i === index ? action : a))
    editor.problem = ''
    actionEdit = null
  }

  // ---- Create Basic Task ----------------------------------------------------------------------------

  async function openWizard(): Promise<void> {
    sessions = await host.api.sessions.list(desktopId).catch(() => sessions)
    wizard = true
  }

  async function finishWizard(input: ScheduledTaskInput, openProperties: boolean): Promise<string | null> {
    try {
      const saved = await host.api.scheduler.create(desktopId, input)
      wizard = false
      node = LIBRARY
      selected = [String(saved.id)]
      await refresh()
      if (openProperties) await openEditor(tasks.find((t) => t.id === saved.id) ?? saved)
      return null
    } catch (e) {
      return e instanceof Error ? e.message : String(e)
    }
  }

  // ---- menus ----------------------------------------------------------------------------------------

  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'task-scheduler')
  const ctxMenu = new ContextMenu()

  const taskItems = (prefix: string): MenuItemDef[] => [
    { id: `${prefix}-run`, testid: `${prefix}-run`, label: '&Run', icon: 'play', disabled: !commands.run, action: () => void run() },
    { id: `${prefix}-end`, testid: `${prefix}-end`, label: '&End', icon: 'stop', disabled: !commands.end, action: () => void end() },
    { id: `${prefix}-toggle`, testid: `${prefix}-toggle`, label: commands.toggleLabel === 'Enable' ? '&Enable' : '&Disable', icon: commands.toggleLabel === 'Enable' ? 'check' : 'pause', disabled: !commands.toggle, action: () => void toggle() },
    { id: `${prefix}-properties`, testid: `${prefix}-properties`, label: '&Properties...', icon: 'properties', disabled: !commands.edit, action: () => void openEditor(current) },
    { id: `${prefix}-delete`, testid: `${prefix}-delete`, label: '&Delete', icon: 'delete', shortcut: 'Del', disabled: !commands.remove, action: () => void remove() }
  ]

  const createItems = (prefix: string): MenuItemDef[] => [
    { id: `${prefix}-create-basic`, testid: `${prefix}-create-basic`, label: 'Create &Basic Task...', icon: 'new', action: () => void openWizard() },
    { id: `${prefix}-create`, testid: `${prefix}-create`, label: 'Create &Task...', icon: 'scheduler', action: () => void openEditor(null) }
  ]

  const rowMenu = (): MenuItemDef[] => [...taskItems('task-scheduler-ctx'), { separator: true }, ...createItems('task-scheduler-ctx'), { separator: true }, { id: 'task-scheduler-ctx-refresh', testid: 'task-scheduler-ctx-refresh', label: 'R&efresh', icon: 'refresh', shortcut: 'F5', action: () => void refresh() }]

  const menus = $derived<MenuDef[]>(
    menuBar([
      { label: '&File', items: [...createItems('task-scheduler-menu'), ...closeItems('task-scheduler', () => void host.closeWindow(win.id))] },
      { label: '&Action', items: taskItems('task-scheduler-menu') },
      { label: '&View', items: [{ id: 'refresh', testid: 'task-scheduler-menu-refresh', label: '&Refresh', icon: 'refresh', shortcut: 'F5', action: () => void refresh() }, { separator: true }, help.paneItem(win.id)] },
      help.menu()
    ])
  )

  function onkeydown(event: KeyboardEvent): void {
    if (event.key === 'F5') {
      event.preventDefault()
      void refresh()
    } else if (event.key === 'Delete' && current && !editor && !wizard && (event.target as HTMLElement).closest('[data-testid="task-scheduler-list"]')) {
      event.preventDefault()
      void remove()
    } else ctxMenu.key(event, rowMenu)
  }

  const paneAction = (id: string, label: string, icon: IconName, enabled: boolean, run: () => void): { id: string; label: string; icon: IconName; enabled: boolean; run: () => void } => ({ id, label, icon, enabled, run })
  const libraryActions = $derived([
    paneAction('create-basic', 'Create Basic Task…', 'new', true, () => void openWizard()),
    paneAction('create', 'Create Task…', 'scheduler', true, () => void openEditor(null)),
    paneAction('refresh', 'Refresh', 'refresh', true, () => void refresh())
  ])
  const taskActions = $derived([
    paneAction('run', 'Run', 'play', commands.run, () => void run()),
    paneAction('end', 'End', 'stop', commands.end, () => void end()),
    paneAction('toggle', commands.toggleLabel, commands.toggleLabel === 'Enable' ? 'check' : 'pause', commands.toggle, () => void toggle()),
    paneAction('properties', 'Properties…', 'properties', commands.edit, () => void openEditor(current)),
    paneAction('delete', 'Delete', 'delete', commands.remove, () => void remove())
  ])
  const triggerInitial = $derived(triggerEdit && triggerEdit.index !== null && editor ? (editor.draft.triggers[triggerEdit.index] ?? null) : null)
  const actionInitial = $derived(actionEdit && actionEdit.index !== null && editor ? (editor.draft.actions[actionEdit.index] ?? null) : null)
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="ts" data-testid="task-scheduler-app" {onkeydown} oncontextmenu={(e) => ctxMenu.show(e, [...createItems('task-scheduler-ctx'), { separator: true }, { id: 'task-scheduler-ctx-refresh', testid: 'task-scheduler-ctx-refresh', label: 'R&efresh', icon: 'refresh', shortcut: 'F5', action: () => void refresh() }])}>
  <MenuStrip {menus} aria-label="Task Scheduler menu" />
  <div class="body">
    <SplitContainer splitterDistance={176} panel1MinSize={120} panel2MinSize={300} fixedPanel="panel1">
      {#snippet panel1()}
        <TreeView testid="task-scheduler-tree" {nodes} bind:selected={node} bind:expanded aria-label="Task Scheduler" class="tree" />
      {/snippet}
      {#snippet panel2()}
        <div class="row">
          <div class="main">
            {#if node === ROOT}
              <div class="overview" data-testid="task-scheduler-overview">
                <h2>Task Scheduler Summary</h2>
                <p>Use Task Scheduler to ask an agent to do a job at a time you choose, once or again and again, for example every morning.</p>
                <dl>
                  <dt>Tasks:</dt>
                  <dd data-testid="task-scheduler-overview-total">{summary.total}</dd>
                  <dt>Ready:</dt>
                  <dd data-testid="task-scheduler-overview-ready">{summary.ready}</dd>
                  <dt>Running:</dt>
                  <dd data-testid="task-scheduler-overview-running">{summary.running}</dd>
                  <dt>Disabled:</dt>
                  <dd data-testid="task-scheduler-overview-disabled">{summary.disabled}</dd>
                  <dt>Last run failed:</dt>
                  <dd data-testid="task-scheduler-overview-failed">{summary.failed}</dd>
                  <dt>Next task:</dt>
                  <dd data-testid="task-scheduler-overview-next">{summary.next ? `${summary.next.name}, ${summary.next.at}` : 'No task is due.'}</dd>
                </dl>
                <p><button type="button" class="link" data-testid="task-scheduler-overview-open-library" onclick={() => (node = LIBRARY)}>Open the Task Scheduler Library</button></p>
              </div>
            {:else}
              <SplitContainer orientation="horizontal" splitterDistance={220} panel1MinSize={90} panel2MinSize={120} fixedPanel="panel2">
                {#snippet panel1()}
                  <div class="center">
                    <div class="heading"><strong>Task Scheduler Library</strong><span class="count" data-testid="task-scheduler-count">{countText(tasks.length)}</span></div>
                    <div class="grid">
                      <ListView
                        testid="task-scheduler-list"
                        columns={LIBRARY_COLUMNS}
                        {rows}
                        bind:selected
                        aria-label="Tasks"
                        emptyText={error ?? 'No tasks. Use Create Basic Task or Create Task to add one.'}
                        onactivate={() => void openEditor(current)}
                        oncontextmenu={(_row, e) => ctxMenu.show(e, rowMenu())}
                      />
                    </div>
                  </div>
                {/snippet}
                {#snippet panel2()}
                  {#if current}
                    <TaskDetail task={current} bind:tab {runs} {ctx} onopenchat={openChat} onclearhistory={() => void clearHistory()} />
                  {:else}
                    <p class="none" data-testid="task-scheduler-none">Select a task to see its details.</p>
                  {/if}
                {/snippet}
              </SplitContainer>
            {/if}
          </div>
          <aside class="actions" aria-label="Actions">
            <div class="ahead">Actions</div>
            <div class="asub">{node === ROOT ? 'Task Scheduler (Local)' : 'Task Scheduler Library'}</div>
            {#each libraryActions as a (a.id)}
              <button type="button" class="act" data-testid="task-scheduler-action-{a.id}" disabled={!a.enabled} onclick={a.run}><Icon name={a.icon} />{a.label}</button>
            {/each}
            {#if node !== ROOT}
              <div class="asub">{current ? `Selected Item: ${current.name}` : 'Selected Item'}</div>
              {#each taskActions as a (a.id)}
                <button type="button" class="act" data-testid="task-scheduler-action-{a.id}" disabled={!a.enabled} onclick={a.run}><Icon name={a.icon} />{a.label}</button>
              {/each}
            {/if}
          </aside>
        </div>
      {/snippet}
    </SplitContainer>
  </div>
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text={error ?? (current ? `${current.name}: ${statusText(current)}` : 'Ready')} spring />
    <StatusStripLabel testid="task-scheduler-total" text={countText(tasks.length)} borders={['left']} width={90} />
  </StatusStrip>

  <ContextMenuStrip bind:open={ctxMenu.open} x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} label="Task Scheduler" />
  <AppAbout {help} />
  {#if wizard}
    <BasicTaskWizard {agents} {drives} {sessions} onfinish={finishWizard} oncancel={() => (wizard = false)} />
  {/if}
  {#if editor}
    <TaskEditorDialog
      bind:draft={editor.draft}
      bind:tab={editor.tab}
      existing={editor.taskId !== null}
      {agents}
      {drives}
      {sessions}
      problem={editor.problem}
      onedittrigger={(index) => (triggerEdit = { index })}
      oneditaction={(index) => (actionEdit = { index })}
      onresult={(r) => void finishEditor(r)}
    />
  {/if}
  {#if triggerEdit && editor}
    {#key triggerEdit}
      <TriggerDialog initial={triggerInitial} onsave={saveTrigger} oncancel={() => (triggerEdit = null)} />
    {/key}
  {/if}
  {#if actionEdit && editor}
    {#key actionEdit}
      <ActionDialog initial={actionInitial} {agents} {drives} {sessions} onsave={saveAction} oncancel={() => (actionEdit = null)} />
    {/key}
  {/if}
</div>

<style>
  .ts {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 4px;
  }
  .body :global(.tree) {
    height: 100%;
  }
  .row {
    height: 100%;
    display: flex;
    gap: 4px;
  }
  .main {
    flex: 1;
    min-width: 0;
    min-height: 0;
  }
  .center {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .heading {
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 24px;
    padding: 0 6px;
    background: linear-gradient(#fdfeff, #e3ecf8);
    border: 1px solid var(--w7-list-border);
    border-bottom: 0;
  }
  .count {
    color: var(--w7-text-muted);
  }
  .grid {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .grid :global(.w7-listview) {
    flex: 1;
    min-height: 0;
  }
  .none {
    margin: 0;
    padding: 8px;
    color: var(--w7-text-muted);
  }
  .overview {
    height: 100%;
    box-sizing: border-box;
    padding: 12px 16px;
    overflow: auto;
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
  }
  .overview h2 {
    margin: 0 0 8px;
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    color: #1e3287;
  }
  .overview p {
    margin: 0 0 10px;
  }
  .overview dl {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 3px 8px;
    margin: 0 0 12px;
  }
  .overview dt {
    color: var(--w7-text-muted);
  }
  .overview dd {
    margin: 0;
  }
  .link {
    border: 0;
    padding: 0;
    background: none;
    font: inherit;
    color: var(--w7-link, #0066cc);
    text-decoration: underline;
    cursor: pointer;
  }
  .actions {
    flex: none;
    width: 170px;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
    overflow: auto;
  }
  .ahead {
    padding: 3px 8px;
    background: linear-gradient(#fdfeff, #dce6f4);
    border-bottom: 1px solid var(--w7-list-border);
    font-weight: 700;
  }
  .asub {
    padding: 4px 8px;
    background: #e8eef7;
    font-weight: 700;
    color: #1e3287;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .act {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border: 1px solid transparent;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: default;
  }
  .act:hover:not(:disabled) {
    border-color: var(--w7-hot-border);
    background: var(--w7-hot-face);
  }
  .act:disabled {
    color: var(--w7-text-disabled);
  }
</style>
