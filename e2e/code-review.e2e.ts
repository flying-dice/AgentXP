import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createWorkspace, see, startScriptedDesktop, type ScriptedDesktop, type Workspace } from './fixtures'

const git = (cwd: string, ...args: string[]): void => {
  execFileSync('git', ['-c', 'user.name=E2E', '-c', 'user.email=e2e@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd, stdio: 'ignore' })
}

const HEAD = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', ''].join('\n')
const WORKING = ['zero', 'one', 'two', 'THREE', 'four', 'five', 'six', 'eight', ''].join('\n')

/** review.json: the reviewer agent leaves two comments and a verdict; the comments go to a chat. */
describe('Code Review', () => {
  let ctx: ScriptedDesktop
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace({ 'notes.txt': HEAD, 'keep.txt': 'unchanged\n' })
    git(workspace.path, 'init', '-q', '-b', 'main')
    git(workspace.path, 'add', '-A')
    git(workspace.path, 'commit', '-q', '-m', 'initial')
    await writeFile(join(workspace.path, 'notes.txt'), WORKING)
    await writeFile(join(workspace.path, 'fresh.txt'), 'brand new\n')
    ctx = await startScriptedDesktop({ script: 'review', title: 'Review desktop', workspace })
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
  })
  afterAll(async () => ctx?.close())

  it('opens from the Start menu, lists the changed files and the reviewer comments on them', async () => {
    const review = ctx.desktop.codeReview()
    await ctx.desktop.openApp('code-review')
    await see.visible(review.app)
    await review.showOutline()
    await see.count(review.files, 2)
    await see.attribute(review.file('notes.txt'), 'data-status', 'modified')
    await see.attribute(review.file('fresh.txt'), 'data-status', 'untracked')
    // The first prompt went out by itself: the agent calls review_add_comment twice, then review_submit.
    await review.openFile('notes.txt')
    await see.count(review.threads, 2)
    await see.attribute(review.verdict, 'data-verdict', 'request_changes')
    await see.text(review.threads.first(), 'stray zero')
  })

  it('the margin bar marks removed lines red and added lines yellow, and F7 steps through the changes', async () => {
    const review = ctx.desktop.codeReview()
    await see.visible(review.margin)
    await see.eventually(async () => {
      const kinds = await review.marginBlocks.evaluateAll((els) => els.map((e) => e.getAttribute('data-kind')))
      expect(new Set(kinds)).toEqual(new Set(['add', 'del']))
    })
    await review.nextChange.click()
    await see.eventually(async () => {
      const selected = await review.rows.evaluateAll((els) => els.filter((e) => e.classList.contains('selected')).length)
      expect(selected).toBe(1)
    })
    await review.splitToggle.click()
    await see.attribute(review.frame.getByTestId('review-diff'), 'data-layout', 'split')
    await review.splitToggle.click()
  })

  it('Send all open comments puts them in the chat the user picks, and the comments become sent', async () => {
    const review = ctx.desktop.codeReview()
    await review.showComments()
    await review.sendAll.click()
    const chat = ctx.desktop.chat()
    await see.visible(review.frame.getByTestId('review-send-dialog'))
    await see.count(review.frame.getByTestId('review-send-chat'), 1)
    await review.frame.getByTestId('review-send-chat').click()
    await review.frame.getByTestId('review-send-confirm').click()
    await see.visible(chat.agentMessage('Fixing the review comments now'))
    await see.text(chat.userMessages.last(), 'notes.txt:4')
    await see.text(chat.userMessages.last(), 'THREE is shouted')
    await see.eventually(async () => {
      const states = await review.threads.evaluateAll((els) => els.map((e) => e.getAttribute('data-state')))
      expect(states).toEqual(['sent', 'sent'])
    })
  })
})
