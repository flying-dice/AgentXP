import type { Locator } from 'playwright'

/** One Code Review window (pass the `window-code-review` frame). Test ids only. */
export class CodeReviewWindow {
  constructor(readonly frame: Locator) {}

  private id(testId: string): Locator {
    return this.frame.getByTestId(testId)
  }

  /** The app root; `data-session-id` is the review session. */
  get app(): Locator {
    return this.id('code-review-app')
  }

  async sessionId(): Promise<number> {
    return Number(await this.app.getAttribute('data-session-id'))
  }

  get files(): Locator {
    return this.id('review-file')
  }

  file(path: string): Locator {
    return this.files.filter({ hasText: path })
  }

  get threads(): Locator {
    return this.id('review-thread')
  }

  get verdict(): Locator {
    return this.id('review-verdict')
  }

  get rows(): Locator {
    return this.id('review-row')
  }

  get margin(): Locator {
    return this.id('review-margin')
  }

  get marginBlocks(): Locator {
    return this.id('review-margin-block')
  }

  get nextChange(): Locator {
    return this.id('review-next-change')
  }

  get prevChange(): Locator {
    return this.id('review-prev-change')
  }

  get splitToggle(): Locator {
    return this.id('review-split-toggle')
  }

  get sendAll(): Locator {
    return this.id('review-send-all')
  }

  /** The button that asks the reviewer for a review; nothing starts before it is clicked (UX-37). */
  get askAgent(): Locator {
    return this.id('review-ask-agent')
  }

  get statusAgent(): Locator {
    return this.id('review-status-agent')
  }

  /** Double-click a file of the outline: the expanded view opens on it. */
  async openFile(path: string): Promise<void> {
    await this.file(path).dblclick()
  }

  async showExpanded(): Promise<void> {
    await this.id('review-view-expanded').click()
  }

  async showOutline(): Promise<void> {
    await this.id('review-view-outline').click()
  }

  async showComments(): Promise<void> {
    if (!(await this.id('review-comments').isVisible())) await this.id('review-comments-toggle').click()
    await this.id('review-comments').waitFor()
  }
}
