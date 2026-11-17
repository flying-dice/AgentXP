import type { AppView, AppWindowState, DesktopState, OpenWindowInput, ToolPolicyDto } from '@shared/desktop'
import { followTarget, type FollowEndReason, type FollowStateDto, type FollowTarget } from '@shared/follow'
import type { AgentIdentity } from '@shared/identity'
import type { Id, TranscriptEntryDto } from '@shared/models'
import type { ShowSpot } from '@shared/show'
import type { VPath } from '@shared/vfs'
import { AppError } from '../errors'
import type { AppEventMessage } from '../FanOutEventPublisher'
import type { EventPublisher } from '../ports'
import type { CheckedTarget, ShowContext } from './ShowTargets'

export interface FollowServiceDeps {
  desktops: {
    state(desktopId: Id): DesktopState
    policy(): ToolPolicyDto
    /** The operator typed or clicked during the last `TYPING_GRACE_MS`: projection waits. */
    operatorActive(desktopId: Id): boolean
    presentWindow(sessionId: Id, input: OpenWindowInput & { windowId?: Id }, focus: boolean): Promise<AppWindowState>
    updateView(windowId: Id, view: AppView): void
    /** Publishes the desktop state again (it carries `following`). */
    refresh(desktopId: Id): void
  }
  sessions: { get(sessionId: Id): { desktopId?: Id | null; cwd: VPath } | null }
  /** The team room a member's session belongs to (its Team Chat window is where the operator watches it), else null. */
  roomOf?(sessionId: Id): Id | null
  identity(sessionId: Id): AgentIdentity
  /** Lands Code at a file and lines (`ShowTargets.land`), without the focus. */
  targets: { land(context: ShowContext, checked: CheckedTarget, focus: boolean): Promise<ShowSpot> }
  /** A show on screen (its note is up): projection waits until the operator is done with it. */
  shows: { onScreen(desktopId: Id): boolean }
  events: EventPublisher
  /** How long to wait before trying again while the operator types (default `TYPING_GRACE_MS`). */
  retryMs?: number
  setTimer?: (run: () => void, ms: number) => unknown
  clearTimer?: (timer: unknown) => void
}

interface Follow {
  sessionId: Id
  keep: boolean
  /** The window the chat lives in (its Chat window, the window of its pane, its Team Chat room): closing it ends the follow. */
  home: Id | null
  /** The last place projected for each tool call, so an update of the same step does not move the view again. */
  projected: Map<string, string>
  /** The newest step that waits while the operator types (or a show is on screen). */
  pending: { key: string; toolCallId: string; target: FollowTarget } | null
  timer: unknown
}

/** How long projection waits between tries while the operator types (the typing grace of `DesktopService`). */
export const FOLLOW_RETRY_MS = 2000

/**
 * Follow (`docs/AGENT_PRESENCE.md`, section 7): the operator watches one chat's work live. While a desktop follows a
 * chat, each Work step of it (read, search, edit, write, run) is projected as a quiet show: Code comes forward at the
 * file and lines (no focus change) and the agent cursor travels there; a run brings the Terminal forward on it. No note.
 *
 * - **One at a time** per desktop; following another chat replaces it.
 * - **The operator wins.** While the operator types (`operatorActive`) or a show's note is on screen, the newest step
 *   waits and lands when they stop.
 * - **Ends** on Stop following, on Pause, at the end of the chat's turn (unless Keep following), or when the chat's
 *   window closes or the chat is deleted. Every end but Stop following is told in one short line (`desktop.followEnded`).
 * - It never opens a window that "Agent may open apps" would ask about: then the step is not projected.
 */
export class FollowService {
  private readonly follows = new Map<Id, Follow>()
  private readonly setTimer: (run: () => void, ms: number) => unknown
  private readonly clearTimer: (timer: unknown) => void

  constructor(private readonly deps: FollowServiceDeps) {
    this.setTimer = deps.setTimer ?? ((run, ms) => setTimeout(run, ms))
    this.clearTimer = deps.clearTimer ?? ((timer) => clearTimeout(timer as ReturnType<typeof setTimeout>))
  }

  /** The chat a desktop follows, for `DesktopState.following`. */
  state(desktopId: Id): FollowStateDto | null {
    const follow = this.follows.get(desktopId)
    return follow ? { sessionId: follow.sessionId, keep: follow.keep, identity: this.deps.identity(follow.sessionId) } : null
  }

  /** The session a desktop follows, or null. */
  followed(desktopId: Id): Id | null {
    return this.follows.get(desktopId)?.sessionId ?? null
  }

  /** **Follow**: the desktop follows this chat from now on (in place of any other). */
  follow(desktopId: Id, sessionId: Id, keep = false): void {
    const session = this.deps.sessions.get(sessionId)
    if (!session || session.desktopId !== desktopId) throw new AppError(`Chat ${sessionId} is not on this desktop.`)
    const state = this.deps.desktops.state(desktopId)
    if (state.paused) throw new AppError('AgentXP is paused. Resume agents to follow a chat.')
    const current = this.follows.get(desktopId)
    if (current?.sessionId === sessionId) {
      if (current.keep !== keep) this.setKeep(desktopId, keep)
      return
    }
    if (current) this.end(desktopId, 'replaced')
    this.follows.set(desktopId, { sessionId, keep, home: this.homeOf(state, sessionId), projected: new Map(), pending: null, timer: null })
    this.deps.desktops.refresh(desktopId)
  }

  /** **Stop following** (or another end: Pause, the turn ended, the chat closed). */
  stop(desktopId: Id, reason: FollowEndReason = 'stopped'): void {
    if (this.follows.has(desktopId)) this.end(desktopId, reason)
  }

  /** **Keep following**: the follow stays after the turn ends. */
  setKeep(desktopId: Id, keep: boolean): void {
    const follow = this.follows.get(desktopId)
    if (!follow) throw new AppError('This desktop follows no chat.')
    follow.keep = keep
    this.deps.desktops.refresh(desktopId)
  }

  /** A turn ended: the follow of that chat ends with it, unless Keep following is on. */
  turnEnded(sessionId: Id): void {
    for (const [desktopId, follow] of this.follows) if (follow.sessionId === sessionId && !follow.keep) this.end(desktopId, 'turn-ended')
  }

  /** App events: a step of the followed chat is projected; Pause, a closed window or a deleted chat end the follow. */
  onEvent(message: AppEventMessage): void {
    switch (message.name) {
      case 'transcript.upserted':
        if (message.payload.entry.kind === 'tool_call') this.step(message.payload.sessionId, message.payload.entry)
        return
      case 'desktop.changed':
        return this.desktopChanged(message.payload)
      case 'session.removed':
        for (const [desktopId, follow] of this.follows) if (follow.sessionId === message.payload.id) this.end(desktopId, 'closed')
        return
      default:
        return
    }
  }

  // ---- internals ----------------------------------------------------------------------------------

  private desktopChanged(state: DesktopState): void {
    const follow = this.follows.get(state.desktopId)
    if (!follow) return
    if (state.paused) return this.end(state.desktopId, 'paused')
    if (follow.home === null) follow.home = this.homeOf(state, follow.sessionId)
    else if (!state.windows.some((w) => w.id === follow.home)) this.end(state.desktopId, 'closed')
  }

  /** The window the chat lives in: its Chat window, the window whose pane it is, or its team room's window. */
  private homeOf(state: DesktopState, sessionId: Id): Id | null {
    const room = this.deps.roomOf?.(sessionId) ?? null
    const home = state.windows.find((w) => (w.view.app === 'chat' && w.view.sessionId === sessionId) || w.asideSessionId === sessionId || (room !== null && w.view.app === 'team-chat' && w.view.roomId === room))
    return home?.id ?? null
  }

  private end(desktopId: Id, reason: FollowEndReason): void {
    const follow = this.follows.get(desktopId)
    if (!follow) return
    if (follow.timer !== null) this.clearTimer(follow.timer)
    this.follows.delete(desktopId)
    this.deps.desktops.refresh(desktopId)
    this.deps.events.publish('desktop.followEnded', { desktopId, sessionId: follow.sessionId, identity: this.deps.identity(follow.sessionId), reason })
  }

  private step(sessionId: Id, entry: Extract<TranscriptEntryDto, { kind: 'tool_call' }>): void {
    const session = this.deps.sessions.get(sessionId)
    const desktopId = session?.desktopId
    if (desktopId == null) return
    const follow = this.follows.get(desktopId)
    if (follow?.sessionId !== sessionId || entry.status === 'failed' || entry.status === 'cancelled') return
    const target = followTarget({ title: entry.title, toolKind: entry.toolKind, rawInput: entry.rawInput, rawOutput: entry.rawOutput, locations: entry.locations, contents: entry.contents }, session?.cwd ?? null)
    if (!target) return
    const key = JSON.stringify(target)
    if (follow.projected.get(entry.toolCallId) === key || follow.pending?.key === `${entry.toolCallId}|${key}`) return
    follow.pending = { key: `${entry.toolCallId}|${key}`, toolCallId: entry.toolCallId, target }
    this.flush(desktopId)
  }

  /** Lands the waiting step now, or tries again later while the operator types or a show is on screen. */
  private flush(desktopId: Id): void {
    const follow = this.follows.get(desktopId)
    if (!follow?.pending) return
    if (this.deps.desktops.state(desktopId).paused) return
    if (this.deps.desktops.operatorActive(desktopId) || this.deps.shows.onScreen(desktopId)) {
      if (follow.timer === null) {
        follow.timer = this.setTimer(() => {
          follow.timer = null
          this.flush(desktopId)
        }, this.deps.retryMs ?? FOLLOW_RETRY_MS)
      }
      return
    }
    const { toolCallId, target } = follow.pending
    follow.pending = null
    follow.projected.set(toolCallId, JSON.stringify(target))
    void this.land(desktopId, follow.sessionId, target).catch(() => {
      // The window went away or the file cannot be shown: the step stays in the chat and the feed.
    })
  }

  private async land(desktopId: Id, sessionId: Id, target: FollowTarget): Promise<void> {
    const { desktops } = this.deps
    const state = desktops.state(desktopId)
    const mayOpen = desktops.policy().openApps === 'allow'
    let spot: ShowSpot
    if (target.kind === 'code') {
      if (!mayOpen && !state.windows.some((w) => w.app === 'code')) return
      spot = await this.deps.targets.land({ desktopId, sessionId }, { target: { kind: 'file', path: target.path, ...(target.lines ? { lines: target.lines } : {}) }, label: target.path }, false)
    } else {
      const open = state.windows.findLast((w) => w.app === 'terminal')
      if (!open && !mayOpen) return
      const window = await desktops.presentWindow(sessionId, { desktopId, app: 'terminal', ...(open ? { windowId: open.id } : {}) }, false)
      const view = desktops.state(desktopId).windows.find((w) => w.id === window.id)?.view
      if (target.terminalId !== null && view?.app === 'terminal' && view.terminalId !== target.terminalId) desktops.updateView(window.id, { ...view, terminalId: target.terminalId })
      spot = { kind: 'window', windowId: window.id }
    }
    // The follow may have ended while the window opened.
    if (this.follows.get(desktopId)?.sessionId !== sessionId) return
    this.deps.events.publish('desktop.agentCursor', { desktopId, sessionId, identity: this.deps.identity(sessionId), spot })
  }
}
