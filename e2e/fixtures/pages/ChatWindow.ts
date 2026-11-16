import type { Locator } from 'playwright'

/** One chat window (pass the `window-chat` frame). */
export class ChatWindow {
  constructor(readonly frame: Locator) {}

  get composer(): Locator {
    return this.frame.getByTestId('chat-composer-input')
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

  get changes(): Locator {
    return this.frame.getByTestId('changes-item')
  }
}
