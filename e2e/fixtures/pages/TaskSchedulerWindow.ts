import type { Locator } from 'playwright'

/** One Task Scheduler window (pass the `window-task-scheduler` frame). Test ids only. */
export class TaskSchedulerWindow {
  constructor(readonly frame: Locator) {}

  private id(testId: string): Locator {
    return this.frame.getByTestId(testId)
  }

  get app(): Locator {
    return this.id('task-scheduler-app')
  }

  get list(): Locator {
    return this.id('task-scheduler-list')
  }

  get rows(): Locator {
    return this.id('task-scheduler-row')
  }

  /** The row of a task, by its name (a part of it; the names of a spec differ). */
  row(name: string): Locator {
    return this.rows.filter({ hasText: name })
  }

  get count(): Locator {
    return this.id('task-scheduler-count')
  }

  get detail(): Locator {
    return this.id('task-scheduler-detail')
  }

  tab(id: 'general' | 'triggers' | 'actions' | 'conditions' | 'settings' | 'history'): Locator {
    return this.id(`task-scheduler-tab-${id}`)
  }

  get historyRows(): Locator {
    return this.id('task-scheduler-history-row')
  }

  /** A command of the Actions pane: `create-basic`, `create`, `refresh`, `run`, `end`, `toggle`, `properties`, `delete`. */
  action(id: string): Locator {
    return this.id(`task-scheduler-action-${id}`)
  }

  /** The Create Basic Task wizard. */
  get wizard(): Locator {
    return this.id('basic-wizard')
  }

  /** The body of the wizard; `data-step` is the step that shows (name, trigger, details, action, finish). */
  get wizardBody(): Locator {
    return this.id('basic-wizard-body')
  }

  /** The Create Task and Properties dialog. */
  get editor(): Locator {
    return this.id('task-editor')
  }

  get triggerDialog(): Locator {
    return this.id('trigger-dialog')
  }

  get actionDialog(): Locator {
    return this.id('action-dialog')
  }

  /** Picks an entry of a ComboBox (its test id and the value of the entry). */
  async choose(combo: string, value: string): Promise<void> {
    await this.id(combo).click()
    // The list opens in the popup layer (above every window), outside this window frame.
    await this.frame.page().getByTestId(`${combo}-option-${value}`).click()
  }

  /** Brings a check box to a state (it toggles only when it differs). */
  async setChecked(testId: string, checked: boolean): Promise<void> {
    const box = this.id(testId)
    if ((await box.getAttribute('aria-checked')) !== String(checked)) await box.click()
  }

  async selectTask(name: string): Promise<void> {
    await this.row(name).click()
  }

  /** The wizard through its five steps. Leaves the Summary page open when `finish` is false. */
  async createBasicTask(task: { name: string; description?: string; kind?: string; prompt: string }, finish = true): Promise<void> {
    await this.action('create-basic').click()
    await this.wizard.waitFor()
    await this.id('basic-wizard-name').fill(task.name)
    if (task.description) await this.id('basic-wizard-description').fill(task.description)
    await this.id('basic-wizard-next').click()
    if (task.kind) await this.id(`basic-wizard-kind-${task.kind}`).click()
    await this.id('basic-wizard-next').click()
    await this.id('basic-wizard-next').click()
    await this.id('basic-wizard-action-prompt').fill(task.prompt)
    await this.id('basic-wizard-next').click()
    if (finish) await this.id('basic-wizard-finish').click()
  }
}
