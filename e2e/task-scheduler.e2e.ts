import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { addServerAndProfile, createWorkspace, launchAgentXP, readProtocolEvents, removeServer, see, startConnectedDesktop, type ConnectedDesktop, type TaskSchedulerWindow, type Workspace } from './fixtures'
import { DesktopPage } from './fixtures/pages/DesktopPage'

/** Task Scheduler: create tasks with the wizard and the full dialog, run and end one, the log in Event Viewer, and keeping tasks over a restart. */
describe('Task Scheduler', () => {
  let userData: string
  let workspace: Workspace
  let ctx: ConnectedDesktop
  let scheduler: TaskSchedulerWindow

  beforeAll(async () => {
    userData = await mkdtemp(join(tmpdir(), 'a7-e2e-scheduler-'))
    workspace = await createWorkspace()
    ctx = await startConnectedDesktop({ title: 'Scheduler desktop', workspace, userData })
  })
  afterAll(async () => {
    await ctx?.app.close()
    await workspace?.remove()
    await rm(userData, { recursive: true, force: true })
  })

  it('opens from its desktop icon, from the Start menu group System Tools, and starts with an empty library', async () => {
    await ctx.desktop.icon('task-scheduler').dblclick()
    await see.visible(ctx.desktop.window('task-scheduler'))
    scheduler = ctx.desktop.taskScheduler()
    await see.visible(scheduler.app)
    await see.text(scheduler.count, '0 tasks')
    await see.text(scheduler.list, 'No tasks.')
    await ctx.desktop.closeWindow('task-scheduler')
    await see.count(ctx.desktop.windows('task-scheduler'), 0)
    await ctx.desktop.openApp('task-scheduler')
    scheduler = ctx.desktop.taskScheduler()
    await see.visible(scheduler.app)
  })

  it('the wizard checks the name, goes through its steps and saves a daily task', async () => {
    await scheduler.action('create-basic').click()
    await see.visible(scheduler.wizard)
    await scheduler.frame.getByTestId('basic-wizard-next').click()
    await see.text(scheduler.frame.getByTestId('basic-wizard-problem'), 'Type a name for the task.')
    await scheduler.frame.getByTestId('basic-wizard-name').fill('Morning review')
    await scheduler.frame.getByTestId('basic-wizard-description').fill('Look at yesterday.')
    await scheduler.frame.getByTestId('basic-wizard-next').click()
    await see.attribute(scheduler.wizardBody, 'data-step', 'trigger')
    await scheduler.frame.getByTestId('basic-wizard-kind-daily').click()
    await scheduler.frame.getByTestId('basic-wizard-next').click()
    await see.attribute(scheduler.wizardBody, 'data-step', 'details')
    await see.visible(scheduler.frame.getByTestId('basic-wizard-trigger-every'))
    await scheduler.frame.getByTestId('basic-wizard-next').click()
    await see.attribute(scheduler.wizardBody, 'data-step', 'action')
    await scheduler.frame.getByTestId('basic-wizard-next').click()
    await see.text(scheduler.frame.getByTestId('basic-wizard-problem'), 'Type the prompt for the agent.')
    await scheduler.frame.getByTestId('basic-wizard-action-prompt').fill('Review the changes of yesterday.')
    await scheduler.frame.getByTestId('basic-wizard-next').click()
    await see.attribute(scheduler.wizardBody, 'data-step', 'finish')
    await see.text(scheduler.frame.getByTestId('basic-wizard-summary'), 'Morning review')
    await see.text(scheduler.frame.getByTestId('basic-wizard-summary'), 'every day')
    await scheduler.frame.getByTestId('basic-wizard-finish').click()
    await see.gone(scheduler.wizard)
    await see.count(scheduler.rows, 1)
    const row = scheduler.row('Morning review')
    await see.attribute(row, 'data-status', 'ready')
    await see.text(row, 'every day')
    await see.text(scheduler.count, '1 task')
  })

  it('the wizard Back button and Cancel keep nothing', async () => {
    await scheduler.createBasicTask({ name: 'Never saved', prompt: 'x' }, false)
    await see.attribute(scheduler.wizardBody, 'data-step', 'finish')
    await scheduler.frame.getByTestId('basic-wizard-back').click()
    await see.attribute(scheduler.wizardBody, 'data-step', 'action')
    await scheduler.frame.getByTestId('basic-wizard-cancel').click()
    await see.gone(scheduler.wizard)
    await see.count(scheduler.rows, 1)
  })

  it('shows the six tabs of the selected task', async () => {
    await scheduler.selectTask('Morning review')
    await see.visible(scheduler.detail)
    await see.text(scheduler.frame.getByTestId('task-scheduler-general-name'), 'Morning review')
    await scheduler.tab('triggers').click()
    await see.text(scheduler.frame.getByTestId('task-scheduler-triggers'), 'every day')
    await scheduler.tab('actions').click()
    await see.text(scheduler.frame.getByTestId('task-scheduler-actions'), 'Review the changes of yesterday.')
    await scheduler.tab('conditions').click()
    await see.text(scheduler.frame.getByTestId('task-scheduler-conditions'), 'desktop is not paused')
    await scheduler.tab('settings').click()
    await see.text(scheduler.frame.getByTestId('task-scheduler-settings'), 'Allowed')
    await scheduler.tab('history').click()
    await see.text(scheduler.frame.getByTestId('task-scheduler-history'), 'This task has not run yet.')
    await scheduler.tab('general').click()
  })

  it('Create Task: checks the task, edits a weekly trigger and saves with conditions and settings', async () => {
    await scheduler.action('create').click()
    await see.visible(scheduler.editor)
    // Nothing typed yet: OK says what is missing and keeps the dialog open.
    await scheduler.editor.getByTestId('dialog-button-ok').click()
    await see.text(scheduler.frame.getByTestId('task-editor-problem'), 'Type a name for the task.')
    await scheduler.frame.getByTestId('task-editor-name').fill('Weekly check')
    await scheduler.editor.getByTestId('dialog-button-ok').click()
    await see.text(scheduler.frame.getByTestId('task-editor-problem'), 'Type the prompt for the agent.')

    // The action: edit the one the dialog starts with.
    await scheduler.frame.getByTestId('task-editor-tab-actions').click()
    await scheduler.frame.getByTestId('task-editor-actions').getByTestId('task-editor-action-row').first().click()
    await scheduler.frame.getByTestId('task-editor-action-edit').click()
    await see.visible(scheduler.actionDialog)
    await scheduler.frame.getByTestId('action-dialog-prompt').fill('Check the dependencies.')
    await scheduler.actionDialog.getByTestId('dialog-button-ok').click()
    await see.gone(scheduler.actionDialog)
    await see.text(scheduler.frame.getByTestId('task-editor-actions'), 'Check the dependencies.')

    // The trigger: weekly on Monday and Friday; a weekly trigger with no day is refused.
    await scheduler.frame.getByTestId('task-editor-tab-triggers').click()
    await scheduler.frame.getByTestId('task-editor-trigger-new').click()
    await see.visible(scheduler.triggerDialog)
    await scheduler.choose('trigger-dialog-kind', 'weekly')
    for (let d = 0; d < 7; d++) await scheduler.setChecked(`trigger-dialog-dow-${d}`, false)
    await scheduler.triggerDialog.getByTestId('dialog-button-ok').click()
    await see.text(scheduler.frame.getByTestId('trigger-dialog-problem'), 'Select at least one day of the week.')
    await scheduler.setChecked('trigger-dialog-dow-1', true)
    await scheduler.setChecked('trigger-dialog-dow-5', true)
    await scheduler.triggerDialog.getByTestId('dialog-button-ok').click()
    await see.gone(scheduler.triggerDialog)
    await see.text(scheduler.frame.getByTestId('task-editor-triggers'), 'Monday and Friday')

    await scheduler.frame.getByTestId('task-editor-tab-conditions').click()
    await scheduler.setChecked('task-editor-cond-idle', true)
    await scheduler.frame.getByTestId('task-editor-tab-settings').click()
    await scheduler.setChecked('task-editor-set-restart', true)
    await scheduler.choose('task-editor-set-if-running', 'queue')

    await scheduler.editor.getByTestId('dialog-button-ok').click()
    await see.gone(scheduler.editor)
    await see.count(scheduler.rows, 2)
    await see.text(scheduler.row('Weekly check'), 'on Monday and Friday')
    await see.attribute(scheduler.row('Weekly check'), 'data-status', 'ready')
    await scheduler.tab('settings').click()
    await see.text(scheduler.frame.getByTestId('task-scheduler-settings'), 'Queue a new instance')
    await see.text(scheduler.frame.getByTestId('task-scheduler-settings'), 'Restart every 5 minutes, at most 3 times')
    await scheduler.tab('conditions').click()
    await see.text(scheduler.frame.getByTestId('task-scheduler-conditions'), 'working or waiting for an answer')
  })

  it('Properties (double click) shows the saved task and changes it', async () => {
    await scheduler.row('Weekly check').dblclick()
    await see.visible(scheduler.editor)
    await see.attribute(scheduler.frame.getByTestId('task-editor-name'), 'data-testid', 'task-editor-name')
    expect(await scheduler.frame.getByTestId('task-editor-name').inputValue()).toBe('Weekly check')
    await scheduler.frame.getByTestId('task-editor-name').fill('Weekly dependency check')
    await scheduler.editor.getByTestId('dialog-button-ok').click()
    await see.gone(scheduler.editor)
    await see.visible(scheduler.row('Weekly dependency check'))
    await see.count(scheduler.rows, 2)
  })

  it('Disable and Enable follow the status of the task', async () => {
    await scheduler.selectTask('Weekly dependency check')
    await see.text(scheduler.action('toggle'), 'Disable')
    await scheduler.action('toggle').click()
    await see.attribute(scheduler.row('Weekly dependency check'), 'data-status', 'disabled')
    await see.text(scheduler.action('toggle'), 'Enable')
    await see.attribute(scheduler.action('run'), 'disabled', '')
    await scheduler.action('toggle').click()
    await see.attribute(scheduler.row('Weekly dependency check'), 'data-status', 'ready')
  })

  it('Run starts the task, End stops it, and the History tab and the Event Viewer say so', async () => {
    await scheduler.selectTask('Morning review')
    await scheduler.action('run').click()
    await see.attribute(scheduler.row('Morning review'), 'data-status', 'running')
    await see.eventually(async () => expect(await scheduler.action('end').isEnabled()).toBe(true))
    await scheduler.tab('history').click()
    await see.attribute(scheduler.historyRows.first(), 'data-result', 'running')
    // The run's agent asks to write a file at once; on a busy machine its prompt is already up and covers the desktop.
    // Not now closes the prompt (the request stays open), so End can be clicked; the prompt may come a moment later.
    await see.eventually(async () => {
      const notNow = ctx.desktopPage.getByTestId('uac-not-now')
      if (await notNow.isVisible()) await notNow.click()
      await scheduler.action('end').click({ timeout: 1000 })
    })
    await see.attribute(scheduler.row('Morning review'), 'data-status', 'ready')
    await see.attribute(scheduler.historyRows.first(), 'data-result', 'stopped')
    await see.text(scheduler.row('Morning review'), 'Stopped')

    const events = await readProtocolEvents(ctx.desktopPage, { source: 'scheduler' })
    expect(events.map((e) => e.name)).toEqual(expect.arrayContaining(['task/created', 'task/started', 'task/stopped']))

    await ctx.desktop.openApp('event-viewer')
    const viewer = ctx.desktop.window('event-viewer')
    await viewer.getByTestId('event-viewer-log-scheduler').click()
    await viewer.getByTestId('event-viewer-show-all').click()
    await see.attribute(viewer.getByTestId('event-viewer-row').first(), 'data-source', 'scheduler')
    await ctx.desktop.closeWindow('event-viewer')
  })

  it('History: Open chat opens the chat the run used', async () => {
    await scheduler.selectTask('Morning review')
    await scheduler.tab('history').click()
    await scheduler.historyRows.first().click()
    await see.enabled(scheduler.frame.getByTestId('task-scheduler-history-open-chat'))
    await scheduler.frame.getByTestId('task-scheduler-history-open-chat').click()
    await see.visible(ctx.desktop.window('chat'))
    await ctx.desktop.closeWindow('chat')
  })

  it('Clear history empties the History tab', async () => {
    await scheduler.selectTask('Morning review')
    await scheduler.tab('history').click()
    await scheduler.frame.getByTestId('task-scheduler-history-clear').click()
    await see.count(scheduler.historyRows, 0)
  })

  it('the task pane shows the counts when no task is selected and the task when one is', async () => {
    await see.text(scheduler.frame.getByTestId('task-scheduler-details'), 'Morning review')
    await scheduler.frame.getByTestId('task-scheduler-list').click({ position: { x: 5, y: 150 } })
    await see.visible(scheduler.frame.getByTestId('task-scheduler-overview'))
    await see.text(scheduler.frame.getByTestId('task-scheduler-overview-ready'), '2')
    await see.attribute(scheduler.action('run'), 'disabled', '')
  })

  it('the task pane links open Event Viewer and Task Manager', async () => {
    await scheduler.frame.getByTestId('task-scheduler-place-event-viewer').click()
    await see.visible(ctx.desktop.window('event-viewer'))
    await ctx.desktop.closeWindow('event-viewer')
    await scheduler.frame.getByTestId('task-scheduler-place-task-manager').click()
    await see.visible(ctx.desktop.window('agent-manager'))
    await ctx.desktop.closeWindow('agent-manager')
  })

  it('keeps the tasks when AgentXP restarts', async () => {
    await ctx.app.close()
    const again = await launchAgentXP({ userData })
    try {
      const launcherPage = await again.launcherWindow()
      const { LauncherPage } = await import('./fixtures')
      const launcher = new LauncherPage(launcherPage)
      await launcher.connect('Scheduler desktop')
      const { desktopIdByTitle } = await import('./fixtures')
      const desktopPage = await again.desktopWindow(await desktopIdByTitle(launcherPage, 'Scheduler desktop'))
      const desktop = new DesktopPage(desktopPage)
      await desktop.taskbar.waitFor()
      // The window of the desktop comes back with it; open one only when it did not.
      if ((await desktop.windows('task-scheduler').count()) === 0) await desktop.openApp('task-scheduler')
      const restored = desktop.taskScheduler()
      await see.count(restored.rows, 2)
      await see.visible(restored.row('Morning review'))
      await see.visible(restored.row('Weekly dependency check'))
    } finally {
      await again.close()
    }
  })

  it('Delete asks first and removes the task', async () => {
    // The previous test closed the app: start a fresh one for this check.
    const fresh = await startConnectedDesktop({ title: 'Delete desktop', workspace })
    try {
      await fresh.desktop.openApp('task-scheduler')
      const window = fresh.desktop.taskScheduler()
      await window.createBasicTask({ name: 'Short lived', prompt: 'Do nothing.' })
      await see.count(window.rows, 1)
      await window.selectTask('Short lived')
      await window.action('delete').click()
      await fresh.desktopPage.getByTestId('message-box').getByTestId('dialog-button-no').click()
      await see.count(window.rows, 1)
      await window.action('delete').click()
      await fresh.desktopPage.getByTestId('message-box').getByTestId('dialog-button-yes').click()
      await see.count(window.rows, 0)
      await see.text(window.count, '0 tasks')
    } finally {
      await fresh.app.close()
    }
  })

  it('an action can run with a profile, or with chosen skills and MCP servers, and a removed server is flagged', async () => {
    const fresh = await startConnectedDesktop({ title: 'Skills desktop', workspace })
    try {
      const ids = await addServerAndProfile(fresh.desktopPage, 'github', 'Reviewer')
      await fresh.desktop.openApp('task-scheduler')
      const window = fresh.desktop.taskScheduler()

      // The wizard: the action step offers the four choices; a profile is preselected when the choice changes.
      await window.createBasicTask({ name: 'Profile task', prompt: 'Review the open changes.' }, false)
      await window.frame.getByTestId('basic-wizard-back').click()
      await window.choose('basic-wizard-action-capabilities', 'profile')
      await see.text(window.frame.getByTestId('basic-wizard-action-profile-hint'), 'Reviewer')
      await window.frame.getByTestId('basic-wizard-next').click()
      await see.text(window.frame.getByTestId('basic-wizard-summary'), 'Profile: Reviewer')
      await window.frame.getByTestId('basic-wizard-finish').click()
      await see.gone(window.wizard)
      await window.selectTask('Profile task')
      await window.tab('actions').click()
      await see.text(window.frame.getByTestId('task-scheduler-actions'), 'Profile: Reviewer')

      // Properties: choose the skills and the servers by hand.
      await window.row('Profile task').dblclick()
      await see.visible(window.editor)
      await window.frame.getByTestId('task-editor-tab-actions').click()
      await window.frame.getByTestId('task-editor-actions').getByTestId('task-editor-action-row').first().click()
      await window.frame.getByTestId('task-editor-action-edit').click()
      await see.visible(window.actionDialog)
      await window.choose('action-dialog-capabilities', 'custom')
      await window.frame.getByTestId(`action-dialog-server-${ids.serverId}-check`).click()
      await window.actionDialog.getByTestId('dialog-button-ok').click()
      await see.gone(window.actionDialog)
      await see.text(window.frame.getByTestId('task-editor-actions'), '0 skills, 1 MCP server')
      await window.editor.getByTestId('dialog-button-ok').click()
      await see.gone(window.editor)
      await see.text(window.frame.getByTestId('task-scheduler-actions'), '0 skills, 1 MCP server')

      // The server is removed: the list says so, and the task cannot be saved until the choice is cleared.
      await removeServer(fresh.desktopPage, ids.serverId)
      await window.frame.getByTestId('task-scheduler-action-refresh').click()
      await see.text(window.frame.getByTestId('task-scheduler-actions'), '0 skills, 1 MCP server')
      await window.row('Profile task').dblclick()
      await see.visible(window.editor)
      await window.editor.getByTestId('dialog-button-ok').click()
      await see.text(window.frame.getByTestId('task-editor-problem'), 'no longer exists')
      await window.frame.getByTestId('task-editor-tab-actions').click()
      await window.frame.getByTestId('task-editor-actions').getByTestId('task-editor-action-row').first().click()
      await window.frame.getByTestId('task-editor-action-edit').click()
      await see.text(window.frame.getByTestId('action-dialog-server-gone-0'), 'removed')
      await window.frame.getByTestId('action-dialog-server-gone-0-check').click()
      await window.actionDialog.getByTestId('dialog-button-ok').click()
      await window.editor.getByTestId('dialog-button-ok').click()
      await see.gone(window.editor)
      await see.text(window.frame.getByTestId('task-scheduler-actions'), '0 skills, 0 MCP servers')
    } finally {
      await fresh.app.close()
    }
  })
})
