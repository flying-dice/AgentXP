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
  import TaskPane from '../../kit/organisms/TaskPane.svelte'
  import TaskPaneLink from '../../kit/molecules/TaskPaneLink.svelte'
  import TaskPaneSection from '../../kit/molecules/TaskPaneSection.svelte'
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
  import { blankTask, commandsFor, countText, defaultProject, formatWhen, inputOf, lastResultText, LIBRARY_COLUMNS, overview, statusText, taskRows } from './taskModel'

  let { window: win, host }: AppProps<'task-scheduler'> = $props()

  let tasks = $state.raw<ScheduledTaskDto[]>([])
  let agents = $state.raw<AgentDto[]>([])
  let sessions = $state.raw<SessionDto[]>([])
  let runs = $state.raw<TaskRunDto[]>([])
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
    <div class="pane">
      <TaskPane testid="task-scheduler-pane" aria-label="Task Scheduler tasks">
        <TaskPaneSection title="Task Scheduler Tasks" testid="task-scheduler-section-tasks">
          {#each libraryActions as a (a.id)}
            <TaskPaneLink testid="task-scheduler-action-{a.id}" icon={a.icon} label={a.label} disabled={!a.enabled} onclick={a.run} />
          {/each}
        </TaskPaneSection>
        <TaskPaneSection title={current ? 'Selected Task' : 'Selected Task (none)'} testid="task-scheduler-section-selected">
          {#each taskActions as a (a.id)}
            <TaskPaneLink testid="task-scheduler-action-{a.id}" icon={a.icon} label={a.label} disabled={!a.enabled} onclick={a.run} />
          {/each}
        </TaskPaneSection>
        <TaskPaneSection title="Other Places" testid="task-scheduler-section-places">
          <TaskPaneLink testid="task-scheduler-place-event-viewer" icon="eventlog" label="Event Viewer" title="See what the scheduler did, in the Task Scheduler log" onclick={() => void host.openEventViewer()} />
          <TaskPaneLink testid="task-scheduler-place-task-manager" icon="taskmgr" label="Task Manager" title="See the chats that run" onclick={() => void host.openTaskManager('chats')} />
        </TaskPaneSection>
        <TaskPaneSection title="Details" collapsible={false} testid="task-scheduler-section-details">
          {#if current}
            <div class="details" data-testid="task-scheduler-details" data-task-id={current.id}>
              <strong class="dname">{current.name}</strong>
              <span>Status: {statusText(current)}</span>
              <span>Next run: {current.nextRunAt ? formatWhen(current.nextRunAt) : 'none'}</span>
              <span>Last result: {lastResultText(current) || 'not run yet'}</span>
            </div>
          {:else}
            <div class="details" data-testid="task-scheduler-overview">
              <strong class="dname">{countText(summary.total)}</strong>
              <span>Ready: <span data-testid="task-scheduler-overview-ready">{summary.ready}</span></span>
              <span>Running: <span data-testid="task-scheduler-overview-running">{summary.running}</span></span>
              <span>Disabled: <span data-testid="task-scheduler-overview-disabled">{summary.disabled}</span></span>
              <span>Last run failed: <span data-testid="task-scheduler-overview-failed">{summary.failed}</span></span>
              <span data-testid="task-scheduler-overview-next">{summary.next ? `Next: ${summary.next.name}, ${summary.next.at}` : 'No task is due.'}</span>
            </div>
          {/if}
        </TaskPaneSection>
      </TaskPane>
    </div>
    <div class="main">
      <SplitContainer orientation="horizontal" splitterDistance={240} panel1MinSize={90} panel2MinSize={120} fixedPanel="panel2">
        {#snippet panel1()}
          <div class="center">
            <div class="heading"><Icon name="scheduler" /><strong>Scheduled tasks</strong><span class="count" data-testid="task-scheduler-count">{countText(tasks.length)}</span></div>
            <div class="grid">
              <ListView
                testid="task-scheduler-list"
                columns={LIBRARY_COLUMNS}
                {rows}
                bind:selected
                aria-label="Tasks"
                emptyText={error ?? 'No tasks. Click Create Basic Task or Create Task to add one.'}
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
    </div>
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
  }
  .pane {
    flex: none;
    width: 200px;
    min-height: 0;
  }
  .main {
    flex: 1;
    min-width: 0;
    min-height: 0;
    padding: 4px;
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
    gap: 6px;
    height: 24px;
    padding: 0 6px;
    background: var(--w7-face);
    border: 1px solid var(--w7-list-border);
    border-bottom: 0;
  }
  .count {
    margin-left: 6px;
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
  .details {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .dname {
    overflow-wrap: anywhere;
    margin-bottom: 2px;
  }
</style>
