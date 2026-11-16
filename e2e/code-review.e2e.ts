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
    // Opening the window starts nothing: there are no comments until the user asks the reviewer.
    await review.openFile('notes.txt')
    await see.count(review.threads, 0)
    await review.showOutline()
    // The agent calls review_add_comment twice, then review_submit.
    await review.askAgent.click()
    await review.openFile('notes.txt')
    await see.count(review.threads, 2)
    await see.attribute(review.verdict, 'data-verdict', 'request_changes')
    await see.text(review.threads.first(), 'stray zero')
  })

  it('says every number in digits and shows how many files are shown (UX-77)', async () => {
    const review = ctx.desktop.codeReview()
    await see.text(review.verdict.getByTestId('review-verdict-line'), /Changes requested\. 2 comments/)
    await see.text(review.frame.getByTestId('review-status-files'), '2 files changed. Showing 1 (the one you opened).')
    await see.visible(review.frame.getByTestId('review-send-comments'))
    await see.enabled(review.frame.getByTestId('review-send-comments'))
  })

  it('names the window after the project and puts a word on every comment button (UX-108, UX-109)', async () => {
    const review = ctx.desktop.codeReview()
    await see.text(ctx.desktop.window('code-review').getByTestId('window-title'), /^Review - /)
    const thread = review.threads.first()
    await see.text(thread.getByTestId('review-comment-resolve'), 'Resolve')
    await see.text(thread.getByTestId('review-comment-reply'), 'Reply')
    await see.text(thread.getByTestId('review-comment-send'), 'Send to chat')
    await see.text(thread.getByTestId('review-comment-delete'), 'Delete')
    // The "+" is there without pointing at the line.
    const plus = review.rows.nth(1).getByTestId('review-gutter-plus')
    await see.visible(plus)
    await see.attribute(plus, 'title', 'Add a comment on this line')
  })

  it('the + is a clearly visible 16 px control, the Add comment button and the line number open the box (UX-108, UX-122)', async () => {
    const review = ctx.desktop.codeReview()
    // What is on screen counts: the sign of the "+" is at least 16 x 16 px and not faded to nothing, without pointing at it.
    const row = review.rows.nth(2)
    const glyph = row.getByTestId('review-gutter-plus-glyph')
    await see.visible(glyph)
    const box = await glyph.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(16)
    expect(box!.height).toBeGreaterThanOrEqual(16)
    expect(Number(await row.getByTestId('review-gutter-plus').evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThanOrEqual(0.5)
    // Nothing is selected: the toolbar button is grey and says why.
    const add = review.frame.getByTestId('review-add-comment')
    await see.eventually(async () => expect(await add.isDisabled()).toBe(true))
    await add.hover()
    await see.text(ctx.desktopPage.getByTestId('tooltip'), /Select a line first/)
    // Select a line: the button opens the box for it, with no double click.
    await row.getByTestId('review-gutter-add').click()
    await see.visible(review.frame.getByTestId('review-compose'))
    // A click on the number selected the line as well as opening the box.
    await see.eventually(async () => expect(await row.evaluate((el) => el.classList.contains('selected'))).toBe(true))
    await review.frame.getByTestId('review-compose-cancel').click()
    await see.gone(review.frame.getByTestId('review-compose'))
    await see.enabled(add)
    await add.click()
    await see.visible(review.frame.getByTestId('review-compose'))
    await review.frame.getByTestId('review-compose-cancel').click()
    await see.gone(review.frame.getByTestId('review-compose'))
  })

  it('a comment opens from the + , the right-click menu and a double click, and the box explains Minor (UX-76)', async () => {
    const review = ctx.desktop.codeReview()
    const row = review.rows.nth(1)
    // The blue + of the gutter.
    await row.hover()
    await row.getByTestId('review-gutter-plus').click()
    await see.visible(review.frame.getByTestId('review-compose'))
    await see.text(review.frame.getByTestId('review-compose-severity-help'), 'Minor is the usual choice for a suggestion')
    await review.frame.getByTestId('review-compose-cancel').click()
    await see.gone(review.frame.getByTestId('review-compose'))
    // The right-click menu.
    await row.click({ button: 'right' })
    await ctx.desktopPage.getByTestId('review-ctx-add-comment').click()
    await see.visible(review.frame.getByTestId('review-compose'))
    await review.frame.getByTestId('review-compose-cancel').click()
    await see.gone(review.frame.getByTestId('review-compose'))
    // A double click on the line.
    await row.dblclick()
    await see.visible(review.frame.getByTestId('review-compose'))
    await review.frame.getByTestId('review-compose-cancel').click()
    await see.gone(review.frame.getByTestId('review-compose'))
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
    // The chat is named as its window is, never "Chat 3" (UX-109).
    expect(await review.frame.getByTestId('review-send-chat').innerText()).not.toMatch(/^Chat \d/)
    // The open chat and the new one cannot be mixed up: "Chat: <name> (in <folder>)" and "Start a new chat for these comments" (UX-122).
    await see.text(review.frame.getByTestId('review-send-chat-name'), /^Chat: .+ \(in .+\)$/)
    await see.text(review.frame.getByTestId('review-send-new-chat'), 'Start a new chat for these comments')
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
