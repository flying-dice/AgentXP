import { randomUUID } from 'node:crypto'
import type { DesktopState, ToolPolicyDto } from '@shared/desktop'
import type { AgentIdentity } from '@shared/identity'
import type { Id } from '@shared/models'
import type { NoticeDto } from '@shared/notices'
import { GLIDE_MS, showRequestText, showResultText, type PageBoxDto, type ShowEndReason, type ShowOutcome, type ShowSpot, type ShowTarget } from '@shared/show'
import { AppError } from '../errors'
import type { AppEventMessage } from '../FanOutEventPublisher'
import type { EventPublisher } from '../ports'
import type { CheckedTarget, ShowContext } from './ShowTargets'

export interface ShowServiceDeps {
  desktops: {
    state(desktopId: Id): DesktopState
    foregroundSessionId(desktopId: Id): Id | null
    policy(): ToolPolicyDto
  }
  /** Who the agent of a session is (`agentIdentity`). */
  identity(sessionId: Id): AgentIdentity
  /** Puts a permission request in the chat (the tool gateway's `ask`); true when allowed. */
  ask(sessionId: Id, title: string, reason: string): Promise<boolean>
  targets: {
    check(context: ShowContext, target: ShowTarget): Promise<CheckedTarget>
    land(context: ShowContext, checked: CheckedTarget, focus: boolean): Promise<ShowSpot>
  }
  events: EventPublisher
  /** The chat the operator follows on a desktop (Follow): its Browser actions get the cursor like the foreground chat's. */
  followed?: (desktopId: Id) => Id | null
  /** Waits (the Browser click waits for the cursor's glide); tests pass an instant one. */
  sleep?: (ms: number) => Promise<void>
  now?: () => Date
  newId?: () => string
}

/** What the `show` tool returns to the agent. */
export interface ShowResult {
  outcome: ShowOutcome
  label: string
  /** The tool result text (`showResultText`). */
  text: string
}

/** A show that was asked for: on screen, waiting its turn, or a request balloon nobody answered yet. */
interface Show {
  showId: string
  desktopId: Id
  sessionId: Id
  identity: AgentIdentity
  checked: CheckedTarget
  note: string
}

/** How long the Browser click waits after the cursor was told to glide: the glide and a breath. */
export const BROWSER_POINT_WAIT_MS = GLIDE_MS + 80

/**
 * Show (`docs/AGENT_PRESENCE.md`, section 5). The `show` tool and its deprecated aliases come here:
 *
 * - **Policy.** "Agent may show you things" Never: not shown, the transcript row says so. Ask, or "Ask before every
 *   action": the chat asks first (a stale target is an error before anything is asked or opened).
 * - **Foreground rule.** The foreground chat's show lands now: the window comes forward at the spot and
 *   `desktop.show` makes the cursor glide and the note appear. Any other chat gets a request notice with **Show** and
 *   **Not now**, kept in the Action Center.
 * - **One at a time.** A second foreground show waits until the operator is done with the first (`dismiss`).
 * - **Pause** drops every show and request of the desktop.
 *
 * It also points the cursor for the Browser (`pointAt`): the box of the element, before the click.
 */
export class ShowService {
  private readonly active = new Map<Id, Show>()
  private readonly queues = new Map<Id, Show[]>()
  private readonly requests = new Map<string, Show>()
  private readonly sleep: (ms: number) => Promise<void>

  constructor(private readonly deps: ShowServiceDeps) {
    this.sleep = deps.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  }

  /** The `show` tool: decides between now, queued, request and not shown. Rejects (a tool error) when the target is not there. */
  async show(context: ShowContext, target: ShowTarget, note: string): Promise<ShowResult> {
    const { desktopId, sessionId } = context
    const state = this.deps.desktops.state(desktopId)
    if (state.paused) throw new AppError('AgentXP is paused by the user. Nothing was shown.')
    const decision = this.deps.desktops.policy().groups.show
    const checked = await this.deps.targets.check(context, target)
    if (decision === 'deny') return this.result('never', checked.label, 'Nothing moved: "Agent may show you things" is set to Never in Control Center. Say it in the chat instead.')
    if (decision === 'ask' || state.userInControl) {
      const reason = decision === 'ask' ? 'Agent may show you things is set to Ask in Control Center' : 'You are in control of this desktop'
      if (!(await this.deps.ask(sessionId, `Show you ${checked.label}`, reason))) return this.result('declined', checked.label, 'The user declined; nothing moved.')
    }
    const show: Show = { showId: this.newId(), desktopId, sessionId, identity: this.deps.identity(sessionId), checked, note: note.trim() }
    if (this.deps.desktops.foregroundSessionId(desktopId) !== sessionId) {
      this.request(show)
      return this.result('request', checked.label, 'The user is not in your chat, so they got a request with Show and Not now (also in the Action Center). Do not wait for it.')
    }
    if (this.active.has(desktopId)) {
      const queue = [...(this.queues.get(desktopId) ?? []), show]
      this.queues.set(desktopId, queue)
      this.publishQueue(desktopId)
      return this.result('queued', checked.label, `Another show is on screen; yours comes next (${queue.length} waiting).`)
    }
    await this.present(show, { focus: false, cursor: true })
    return this.result('shown', checked.label, 'The user sees it at the spot with your note. Continue in the chat.')
  }

  /** The operator is done with the show on screen (OK, Reply, Esc, a click or a key): the next one waiting lands. */
  async dismiss(desktopId: Id, showId: string): Promise<void> {
    if (this.active.get(desktopId)?.showId !== showId) return
    this.end(desktopId, 'dismissed')
    await this.next(desktopId)
  }

  /** **Show** on a request: the operator asked, so the target opens with the focus, in place of any show on screen. */
  async accept(desktopId: Id, showId: string): Promise<void> {
    const show = this.requests.get(showId)
    if (!show || show.desktopId !== desktopId) throw new AppError('That show is no longer waiting (Pause dropped it, or it was shown already).')
    this.requests.delete(showId)
    this.publishQueue(desktopId)
    // The target may be gone since: check again, so nothing opens on a stale spot.
    const checked = await this.deps.targets.check({ desktopId, sessionId: show.sessionId }, show.checked.target)
    if (this.active.has(desktopId)) this.end(desktopId, 'replaced')
    await this.present({ ...show, checked }, { focus: true, cursor: true })
  }

  /** **Show again** on a transcript row: the operator asked; the view lands at the spot with the note, without the cursor. */
  async again(context: ShowContext, target: ShowTarget, note: string): Promise<void> {
    if (this.deps.desktops.state(context.desktopId).paused) throw new AppError('AgentXP is paused. Resume to show it again.')
    const checked = await this.deps.targets.check(context, target)
    if (this.active.has(context.desktopId)) this.end(context.desktopId, 'replaced')
    await this.present({ showId: this.newId(), ...context, identity: this.deps.identity(context.sessionId), checked, note: note.trim() }, { focus: true, cursor: false })
  }

  /**
   * The Browser is about to click, type or select: the agent cursor glides to the element's box first, then the action
   * happens. Only when the Browser window is on screen and the session is the foreground chat or the followed one.
   * Resolves true when the cursor was sent (after the glide).
   */
  async pointAt(context: ShowContext, windowId: Id, box: PageBoxDto): Promise<boolean> {
    const { desktopId, sessionId } = context
    const state = this.deps.desktops.state(desktopId)
    const window = state.windows.find((w) => w.id === windowId)
    if (state.paused || !window || window.windowState === 'minimized') return false
    if (this.deps.desktops.foregroundSessionId(desktopId) !== sessionId && this.deps.followed?.(desktopId) !== sessionId) return false
    this.deps.events.publish('desktop.agentCursor', { desktopId, sessionId, identity: this.deps.identity(sessionId), spot: { kind: 'page-box', windowId, box } })
    await this.sleep(BROWSER_POINT_WAIT_MS)
    return true
  }

  /** True while a show is on screen on the desktop (its note callout is up): Follow does not move the view under it. */
  onScreen(desktopId: Id): boolean {
    return this.active.has(desktopId)
  }

  /** How many things wait for the operator on a desktop: queued shows and unanswered requests. */
  waiting(desktopId: Id): number {
    return (this.queues.get(desktopId)?.length ?? 0) + [...this.requests.values()].filter((r) => r.desktopId === desktopId).length
  }

  /** App events: Pause drops every show of the desktop (the cursors hide in the renderer). */
  onEvent(message: AppEventMessage): void {
    if (message.name !== 'desktop.changed' || !message.payload.paused) return
    this.dropAll(message.payload.desktopId)
  }

  /** Pause: the show on screen ends, the queue and the requests go. */
  dropAll(desktopId: Id): void {
    const had = this.waiting(desktopId) > 0
    if (this.active.has(desktopId)) this.end(desktopId, 'paused')
    this.queues.delete(desktopId)
    for (const [id, request] of this.requests) if (request.desktopId === desktopId) this.requests.delete(id)
    if (had) this.publishQueue(desktopId)
  }

  // ---- internals ----------------------------------------------------------------------------------

  private async present(show: Show, options: { focus: boolean; cursor: boolean }): Promise<void> {
    const context = { desktopId: show.desktopId, sessionId: show.sessionId }
    const spot = await this.deps.targets.land(context, show.checked, options.focus)
    this.active.set(show.desktopId, show)
    this.deps.events.publish('desktop.show', {
      desktopId: show.desktopId,
      showId: show.showId,
      sessionId: show.sessionId,
      identity: show.identity,
      target: show.checked.target,
      label: show.checked.label,
      note: show.note,
      spot,
      cursor: options.cursor,
      at: this.now()
    })
  }

  /** The next queued show lands; one whose target went away meanwhile is skipped. */
  private async next(desktopId: Id): Promise<void> {
    const queue = this.queues.get(desktopId) ?? []
    while (queue.length > 0 && !this.active.has(desktopId)) {
      const show = queue.shift()!
      this.publishQueue(desktopId)
      try {
        const checked = await this.deps.targets.check({ desktopId, sessionId: show.sessionId }, show.checked.target)
        await this.present({ ...show, checked }, { focus: false, cursor: true })
      } catch {
        // Gone or closed since it was queued: the operator is not shown a stale spot.
      }
    }
    if (queue.length === 0) this.queues.delete(desktopId)
  }

  private end(desktopId: Id, reason: ShowEndReason): void {
    const show = this.active.get(desktopId)
    if (!show) return
    this.active.delete(desktopId)
    this.deps.events.publish('desktop.showEnded', { desktopId, showId: show.showId, reason })
  }

  private request(show: Show): void {
    this.requests.set(show.showId, show)
    const notice: NoticeDto = {
      desktopId: show.desktopId,
      id: `show-${show.showId}`,
      kind: 'show',
      title: 'Show request',
      text: `${showRequestText(show.identity.name, show.checked.label)}: ${show.note}`,
      identity: show.identity,
      sessionId: show.sessionId,
      actions: [
        { id: `show-${show.showId}-show`, label: 'Show', target: { kind: 'show', showId: show.showId } },
        { id: `show-${show.showId}-later`, label: 'Not now', target: { kind: 'later' } }
      ],
      at: this.now()
    }
    this.deps.events.publish('desktop.notice', notice)
    this.publishQueue(show.desktopId)
  }

  private publishQueue(desktopId: Id): void {
    this.deps.events.publish('desktop.showQueue', { desktopId, waiting: this.waiting(desktopId) })
  }

  private result(outcome: ShowOutcome, label: string, explanation: string): ShowResult {
    return { outcome, label, text: showResultText(outcome, label, explanation) }
  }

  private now(): string {
    return (this.deps.now?.() ?? new Date()).toISOString()
  }

  private newId(): string {
    return this.deps.newId?.() ?? randomUUID()
  }
}
