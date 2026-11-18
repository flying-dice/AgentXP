import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ControlClient } from '../agents/scripted-agent/controlClient'
import { createWorkspace, see, setToolPolicy, setWindowSize, shot as shotOf, startScriptedDesktop, type ScriptedDesktop, type Workspace } from './fixtures'

const git = (cwd: string, ...args: string[]): void => {
  execFileSync('git', ['-c', 'user.name=E2E', '-c', 'user.email=e2e@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd, stdio: 'ignore' })
}

const HEAD = ['one', 'two', 'three', 'four', 'five', ''].join('\n')
const WORKING = ['zero', 'one', 'two', 'THREE', 'four', 'five', ''].join('\n')

/**
 * Notices and Output (docs/AGENT_PRESENCE.md, section 6), with notices.json: the operator hears once about agent work
 * they did not watch, in a balloon that the Action Center keeps; the foreground chat and focused windows get none, and an
 * open window shows the output live with a short change cue.
 */
describe('Notices', () => {
  let ctx: ScriptedDesktop
  let workspace: Workspace
  let control: ControlClient
  const shot = (name: string): Promise<void> => shotOf(ctx.desktopPage, `notices-${name}`)
  const messages = () => ctx.desktopPage.getByTestId('action-center-message')
  const closeActionCenter = async (): Promise<void> => {
    if (await ctx.desktop.actionCenter.isVisible()) await ctx.desktop.actionCenterFlag.click()
    await see.gone(ctx.desktop.actionCenter)
  }

  beforeAll(async () => {
    workspace = await createWorkspace({ 'notes.txt': HEAD })
    git(workspace.path, 'init', '-q', '-b', 'main')
    git(workspace.path, 'add', '-A')
    git(workspace.path, 'commit', '-q', '-m', 'initial')
    await writeFile(join(workspace.path, 'notes.txt'), WORKING)
    ctx = await startScriptedDesktop({ script: 'notices', name: 'Builder', title: 'Notices desktop', workspace })
    // code_write writes E:\PLAN.md without asking (the permission prompt is not what this spec is about).
    await setToolPolicy(ctx.desktopPage, { 'fs.write': 'allow' })
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
    // The welcome balloons of a new desktop are not what this spec is about.
    while (await ctx.desktop.balloon.isVisible()) await ctx.desktopPage.getByTestId('balloon-close').click()
  })
  afterAll(async () => {
    control?.close()
    await ctx?.close()
  })

  it('the foreground chat gets no balloon: the operator is watching it', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('quick hello')
    await see.visible(chat.agentMessage('Hello.'))
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.count(ctx.desktop.balloon, 0)
    control = await ctx.scripted.control()
  })

  it('a background chat that finishes: one balloon in outcome words with the agent, and the Action Center keeps it', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('background job')
    expect((await control.waitForPause()).label).toBe('finish')
    // The operator goes to another window while the chat works.
    await ctx.desktop.openApp('notepad')
    await see.attribute(ctx.desktop.window('notepad'), 'data-focused', 'true')
    await control.next()
    await see.visible(ctx.desktop.balloon)
    await see.text(ctx.desktop.balloonTitle, 'Chat finished')
    await see.text(ctx.desktop.balloonText, 'Builder finished')
    await see.attribute(ctx.desktop.balloon, 'data-agent', 'Builder')
    await see.visible(ctx.desktopPage.getByTestId('balloon-agent'))
    await see.text(ctx.desktop.balloonAction, 'Open chat')
    await see.text(ctx.desktopPage.getByTestId('notice-announcer'), 'Chat finished: Builder finished')
    // The notice did not take the focus.
    await see.attribute(ctx.desktop.window('notepad'), 'data-focused', 'true')
    await shot('01-background-chat-finished')
    await ctx.desktopPage.getByTestId('balloon-close').click()
    await see.count(ctx.desktop.balloon, 0)

    // The Action Center keeps the notice with its button; the foreground turn before it left none.
    await ctx.desktop.openActionCenter()
    await see.count(messages(), 1)
    await see.text(messages().first().getByTestId('action-center-message-title'), 'Chat finished')
    await see.text(messages().first().getByTestId('action-center-message-text'), 'Builder finished')
    await see.visible(messages().first().getByTestId('action-center-message-agent'))
    await shot('02-action-center-keeps-it')
    await messages().first().getByTestId('action-center-message-action').click()
    await see.gone(ctx.desktop.actionCenter)
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
  })

  it('two notices of one turn queue: one balloon at a time, "1 more", then the next; Review changes opens Code', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('plan the sprint')
    expect((await control.waitForPause()).label).toBe('plan')
    await ctx.desktop.focusWindow('notepad')
    await see.attribute(ctx.desktop.window('notepad'), 'data-focused', 'true')
    await control.next()
    await see.text(ctx.desktop.balloonTitle, 'Board changed')
    await see.text(ctx.desktop.balloonText, "Builder added card 'Login bug' to To do")
    await see.text(ctx.desktop.balloonAction, 'Open board')
    await see.text(ctx.desktopPage.getByTestId('balloon-more'), '1 more')
    await shot('03-two-balloons-queue')
    await ctx.desktopPage.getByTestId('balloon-close').click()
    await see.text(ctx.desktop.balloonTitle, 'Chat finished')
    await see.text(ctx.desktop.balloonText, 'Builder finished: changed 1 file')
    await see.count(ctx.desktopPage.getByTestId('balloon-more'), 0)
    await ctx.desktop.balloonAction.click()
    await see.attribute(ctx.desktop.window('code'), 'data-focused', 'true')
    await see.count(ctx.desktop.balloon, 0)
    await ctx.desktop.closeWindow('code')
  })

  it('a card moved with Kanban open flashes there; asked from its chat pane, there is no balloon', async () => {
    const kanban = await ctx.desktop.openApp('kanban')
    // Maximized, so the Done list is in view next to the chat pane.
    await kanban.getByTestId('window-maximize').click()
    const card = kanban.getByTestId('kanban-card').filter({ hasText: 'Login bug' })
    await see.visible(card)
    await ctx.desktop.openActionCenter()
    const before = await messages().count()
    await closeActionCenter()
    const pane = ctx.desktop.aside('kanban')
    await pane.edgeToggle.click()
    await pane.send('move the login card')
    // Live in the open window, with a short cue; the window keeps the focus.
    await see.attribute(card, 'data-flash', 'true')
    await shot('04-kanban-card-flashes')
    await see.visible(pane.agentMessages.filter({ hasText: 'Moved.' }))
    await see.attribute(kanban, 'data-focused', 'true')
    await see.count(ctx.desktop.balloon, 0)
    await ctx.desktop.openActionCenter()
    await see.count(messages(), before)
    await closeActionCenter()
    await ctx.desktop.closeWindow('kanban')
  })

  it('review comments in a Code Review window behind: one balloon, and Open review lands on the first new comment', async () => {
    const review = ctx.desktop.codeReview()
    await ctx.desktop.openApp('code-review')
    await see.visible(review.app)
    // The reviewer waits 3 s before it comments (its own agent process has no control socket); meanwhile the operator
    // goes back to the chat and the review window is behind.
    await review.askAgent.click()
    await ctx.desktop.taskbarItem('chat').click()
    await see.attribute(ctx.desktop.window('code-review'), 'data-focused', 'false')
    await see.text(ctx.desktop.balloonTitle, 'New review comments')
    await see.text(ctx.desktop.balloonText, 'Builder left 2 comments on notes.txt')
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    await shot('05-review-comments-balloon')
    await ctx.desktop.balloonAction.click()
    await see.attribute(ctx.desktop.window('code-review'), 'data-focused', 'true')
    await see.attribute(review.threads.filter({ hasText: 'stray zero' }), 'data-selected', 'true')
    await shot('06-open-review-on-comment')
  })

  it('review comments with the Code Review window focused flash there: no balloon, the focus stays', async () => {
    const review = ctx.desktop.codeReview()
    await ctx.desktop.openActionCenter()
    const before = await messages().count()
    await closeActionCenter()
    await see.attribute(ctx.desktop.window('code-review'), 'data-focused', 'true')
    await review.askAgent.click()
    await see.count(review.threads, 4)
    await see.attribute(review.threads.filter({ has: ctx.desktopPage.getByTestId('review-comment-body').filter({ hasText: 'shouted' }) }).last(), 'data-flash', 'true')
    await shot('07-review-threads-flash')
    await see.attribute(ctx.desktop.window('code-review'), 'data-focused', 'true')
    await see.count(ctx.desktop.balloon, 0)
    await ctx.desktop.openActionCenter()
    await see.count(messages(), before)
    await closeActionCenter()
  })

  it('balloons stay readable over a maximized window and in a small app window', async () => {
    const chat = ctx.desktop.chat()
    await ctx.desktop.taskbarItem('chat').click()
    await chat.send('background job')
    await control.waitForPause()
    await ctx.desktop.taskbarItem('notepad').click()
    await ctx.desktop.window('notepad').getByTestId('window-maximize').click()
    await see.attribute(ctx.desktop.window('notepad'), 'data-focused', 'true')
    await control.next()
    await see.text(ctx.desktop.balloonText, 'Builder finished')
    await shot('08-balloon-over-maximized-window')
    await ctx.desktop.openActionCenter()
    await shot('09-action-center-history')
    await closeActionCenter()
    await setWindowSize(ctx.app, ctx.desktopPage, 900, 600)
    const box = await ctx.desktop.balloon.boundingBox()
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(900)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(600)
    }
    await shot('10-balloon-small-window')
  })
})
