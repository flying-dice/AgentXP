import type { Locator } from 'playwright'

/** The chat pane of one app window (pass the `window-<app>` frame). Test ids only. */
export class AsidePane {
  constructor(readonly frame: Locator) {}

  /** The panel itself (`data-role="aside"`); not in the DOM while the pane is collapsed. */
  get panel(): Locator {
    return this.frame.getByTestId('embedded-chat')
  }

  /** The slim toggle on the frame edge (collapsed pane). */
  get edgeToggle(): Locator {
    return this.frame.getByTestId('chat-pane-toggle')
  }

  /** The hide button in the panel header. */
  get hide(): Locator {
    return this.frame.getByTestId('embedded-chat-toggle')
  }

  /** "New conversation" in the header (only once the session exists). */
  get newConversation(): Locator {
    return this.frame.getByTestId('embedded-chat-new')
  }

  /** The panel before the first message (no session yet). */
  get blank(): Locator {
    return this.frame.getByTestId('embedded-chat-blank')
  }

  get chips(): Locator {
    return this.frame.getByTestId('embedded-chat-suggestion')
  }

  get composer(): Locator {
    return this.frame.getByTestId('chat-composer-input')
  }

  /** The session id the panel shows (`data-session-id`; 0 before the first message). */
  async sessionId(): Promise<number> {
    return Number(await this.panel.getAttribute('data-session-id'))
  }

  /** Types the message and presses Send. */
  async send(text: string): Promise<void> {
    await this.composer.fill(text)
    await this.frame.getByTestId('chat-send').click()
  }

  get userMessages(): Locator {
    return this.frame.getByTestId('chat-message-user')
  }

  get agentMessages(): Locator {
    return this.frame.getByTestId('chat-message-agent')
  }
}
