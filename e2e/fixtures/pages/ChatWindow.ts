import type { Locator } from 'playwright'

/** One chat window (pass the `window-chat` frame). */
export class ChatWindow {
  constructor(readonly frame: Locator) {}

  get composer(): Locator {
    return this.frame.getByTestId('chat-composer-input')
  }

  /** The chat's session id (`data-session-id` of the chat app root), to scope protocol event queries. */
  async sessionId(): Promise<number> {
    return Number(await this.frame.getByTestId('chat-app').getAttribute('data-session-id'))
  }

  get stop(): Locator {
    return this.frame.getByTestId('chat-stop')
  }

  /** The line that says what the user answered to the last permission request ("You allowed: ..."). */
  get permissionResult(): Locator {
    return this.frame.getByTestId('chat-permission-result')
  }

  /** The line under the answers of the permission dialog box ("Enter denies. Press A to allow."). */
  get permissionHint(): Locator {
    return this.frame.getByTestId('permission-hint')
  }

  get errors(): Locator {
    return this.frame.getByTestId('chat-error')
  }

  /** Notices that a turn ended for another reason than end_turn (refusal, output limit...); `data-reason` is the ACP stop reason. */
  get stopNotices(): Locator {
    return this.frame.getByTestId('chat-stop-notice')
  }

  /** A2UI surfaces drawn into the transcript. */
  get surfaces(): Locator {
    return this.frame.getByTestId('a2ui-surface')
  }

  /** The chat rows of A2UI surfaces (every target; inline ones carry only Delete and Move to). */
  get surfaceRows(): Locator {
    return this.frame.getByTestId('chat-surface-row')
  }

  /** The row of the sidebar or window surface with this title. */
  surfaceRow(title: string): Locator {
    return this.surfaceRows.filter({ hasText: title })
  }

  /** The sidebar beside the transcript (A2UI surfaces with target sidebar) and its tabs. */
  get sidebar(): Locator {
    return this.frame.getByTestId('chat-sidebar')
  }

  get sidebarTabs(): Locator {
    return this.frame.getByTestId('chat-sidebar-tab')
  }

  get transcript(): Locator {
    return this.frame.getByTestId('chat-transcript')
  }

  /** Types the prompt and presses Send. */
  async send(text: string): Promise<void> {
    await this.composer.fill(text)
    await this.frame.getByTestId('chat-send').click()
  }

  get userMessages(): Locator {
    return this.frame.getByTestId('chat-message-user')
  }

  /** Agent messages of the transcript (the "Ready in ..." welcome row has its own id). */
  get agentMessages(): Locator {
    return this.frame.getByTestId('chat-message-agent')
  }

  agentMessage(text: string): Locator {
    return this.agentMessages.filter({ hasText: text })
  }

  get toolCalls(): Locator {
    return this.frame.getByTestId('tool-call-card')
  }

  get permissionDialog(): Locator {
    return this.frame.getByTestId('permission-dialog')
  }

  /** Clicks the permission option (the agent's option id, e.g. `allow` / `reject`). */
  async answerPermission(optionId: string): Promise<void> {
    await this.frame.getByTestId(`permission-option-${optionId}`).click()
  }

  /** Opens the Tasks and changes pane and its Changes tab. */
  async showChanges(): Promise<void> {
    if (!(await this.frame.getByTestId('chat-side-panel').isVisible())) await this.frame.getByTestId('chat-panel-toggle').click()
    await this.frame.getByTestId('chat-tab-changes').click()
  }

  /** Reasoning ("Thinking...") blocks of the transcript. */
  get reasoning(): Locator {
    return this.frame.getByTestId('chat-reasoning')
  }

  /** Opens the Tasks and changes pane and its Tasks tab. */
  async showTasks(): Promise<void> {
    if (!(await this.frame.getByTestId('chat-side-panel').isVisible())) await this.frame.getByTestId('chat-panel-toggle').click()
    await this.frame.getByTestId('chat-tab-tasks').click()
  }

  get tasks(): Locator {
    return this.frame.getByTestId('tasks-item')
  }

  get changes(): Locator {
    return this.frame.getByTestId('changes-item')
  }
}
