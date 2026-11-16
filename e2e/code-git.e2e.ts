import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createWorkspace, see, startConnectedDesktop, type ConnectedDesktop, type Workspace } from './fixtures'

const git = (cwd: string, ...args: string[]): void => {
  execFileSync('git', ['-c', 'user.name=E2E', '-c', 'user.email=e2e@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd, stdio: 'ignore' })
}

const HEAD = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', ''].join('\n')
const WORKING = ['zero', 'one', 'two', 'THREE', 'four', 'five', 'six', 'eight', ''].join('\n')

describe('Code app git awareness', () => {
  let ctx: ConnectedDesktop
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace({ 'notes.txt': HEAD, 'keep.txt': 'unchanged\n' })
    git(workspace.path, 'init', '-q', '-b', 'main')
    git(workspace.path, 'add', '-A')
    git(workspace.path, 'commit', '-q', '-m', 'initial')
    // After the commit: modify one file, add an untracked one.
    await writeFile(join(workspace.path, 'notes.txt'), WORKING)
    await writeFile(join(workspace.path, 'fresh.txt'), 'brand new\n')
    ctx = await startConnectedDesktop({ title: 'Git desktop', workspace })
  })
  afterAll(async () => {
    await ctx?.app.close()
    await workspace?.remove()
  })

  it('the tree shows M for the modified file, U for the untracked one and nothing for the clean one', async () => {
    await ctx.desktop.openApp('code')
    const code = ctx.desktop.code()
    const item = (name: string) => code.frame.getByTestId('code-tree-item').filter({ hasText: name })
    await see.visible(item('notes.txt'))
    await see.attribute(item('notes.txt'), 'data-git-status', 'modified')
    await see.attribute(item('fresh.txt'), 'data-git-status', 'untracked')
    await see.attribute(item('keep.txt'), 'data-git-status', 'none')
    await see.text(item('notes.txt'), 'M')
    await see.text(item('fresh.txt'), 'U')
  })

  it('the status bar shows the branch', async () => {
    await see.text(ctx.desktop.code().frame.getByTestId('code-git-branch'), 'main')
  })

  it('the gutter marks added, modified and deleted lines', async () => {
    const code = ctx.desktop.code()
    await code.openFile('notes.txt')
    const marks = code.frame.getByTestId('code-gutter-mark')
    await see.visible(marks.first())
    await see.attribute(marks.first(), 'data-kind', 'added')
    await see.eventually(async () => {
      const kinds = await marks.evaluateAll((els) => els.map((e) => e.getAttribute('data-kind')))
      expect(new Set(kinds)).toEqual(new Set(['added', 'modified', 'deleted']))
    })
  })

  it('clicking a mark opens the peek with the old lines; Revert hunk restores HEAD', async () => {
    const code = ctx.desktop.code()
    await code.frame.getByTestId('code-gutter-mark').first().click() // zero: added
    await see.visible(code.frame.getByTestId('code-hunk-peek'))
    await code.frame.getByTestId('code-hunk-revert').click()
    await ctx.desktopPage.getByTestId('message-box').getByTestId('dialog-button-yes').click()
    await see.eventually(async () => expect(await readFile(join(workspace.path, 'notes.txt'), 'utf8')).toBe(['one', 'two', 'THREE', 'four', 'five', 'six', 'eight', ''].join('\n')))
    await see.gone(code.frame.getByTestId('code-hunk-peek'))
    // Next change goes to the next hunk and opens its peek (modified: three -> THREE).
    await code.frame.getByTestId('code-next-change').click()
    await see.visible(code.frame.getByTestId('code-hunk-peek'))
    await see.text(code.frame.getByTestId('code-hunk-peek'), 'THREE')
    await see.text(code.frame.getByTestId('code-hunk-peek'), 'three')
  })

  it('View > Focus on the file closes every pane and the file fills the window; Show all panels brings them back (UX-75)', async () => {
    const code = ctx.desktop.code()
    await code.openFile('keep.txt')
    await see.visible(code.frame.getByTestId('code-management'))
    await code.frame.getByTestId('menubar-view').click()
    await ctx.desktopPage.getByTestId('code-menu-focus').click()
    await see.gone(code.frame.getByTestId('code-management'))
    await see.gone(code.frame.getByTestId('code-logs'))
    await see.eventually(async () => {
      const app = await code.frame.getByTestId('code-app').boundingBox()
      const editor = await code.editor.boundingBox()
      expect(editor!.width / app!.width).toBeGreaterThanOrEqual(0.9)
    })
    await code.frame.getByTestId('menubar-view').click()
    await ctx.desktopPage.getByTestId('code-menu-show-all').click()
    await see.visible(code.frame.getByTestId('code-management'))
    await see.visible(code.frame.getByTestId('code-logs'))
  })

  it('Ctrl+Shift+F does the same as the menu item', async () => {
    const code = ctx.desktop.code()
    await code.editor.click()
    await ctx.desktopPage.keyboard.press('Control+Shift+F')
    await see.gone(code.frame.getByTestId('code-management'))
    await ctx.desktopPage.keyboard.press('Control+Shift+F')
    await see.visible(code.frame.getByTestId('code-management'))
  })

  it('the Focus on the file button gives the file the whole window and reads Show panes; F11 does the same (UX-106)', async () => {
    const code = ctx.desktop.code()
    const toggle = code.frame.getByTestId('code-focus-toggle')
    await see.text(toggle, 'Focus on the file')
    await toggle.click()
    await see.text(toggle, 'Show panes')
    await see.gone(code.frame.getByTestId('code-management'))
    await see.gone(code.frame.getByTestId('code-logs'))
    await see.eventually(async () => {
      const app = await code.frame.getByTestId('code-app').boundingBox()
      const editor = await code.editor.boundingBox()
      expect(editor!.width / app!.width).toBeGreaterThanOrEqual(0.9)
    })
    await toggle.click()
    await see.text(toggle, 'Focus on the file')
    await see.visible(code.frame.getByTestId('code-management'))
    await see.visible(code.frame.getByTestId('code-logs'))
    await code.editor.click()
    await ctx.desktopPage.keyboard.press('F11')
    await see.text(toggle, 'Show panes')
    await ctx.desktopPage.keyboard.press('F11')
    await see.text(toggle, 'Focus on the file')
    await see.visible(code.frame.getByTestId('code-management'))
  })

  it('the Git list shows the lines of each file and double-click opens the file that was clicked (UX-78)', async () => {
    const code = ctx.desktop.code()
    await code.frame.getByTestId('code-logs-tab-git').click()
    const title = await code.frame.getByTestId('code-logs-tab-git').getAttribute('title')
    expect(title).toContain('with changes that are not saved in version control')
    const rows = code.frame.getByTestId('code-git-entry')
    await see.count(rows, 2)
    await see.text(rows.filter({ hasText: 'fresh.txt' }), '+1 / -0')
    // The tooltip of a row names the lines that changed (UX-107).
    await see.eventually(async () => expect(await rows.filter({ hasText: 'notes.txt' }).getAttribute('title')).toMatch(/^notes\.txt: lines? [\d, and]+ changed$/))
    // Nothing is selected until the user picks a row.
    expect(await rows.evaluateAll((els) => els.filter((e) => e.getAttribute('aria-selected') === 'true').length)).toBe(0)
    await rows.filter({ hasText: 'fresh.txt' }).dblclick()
    const review = ctx.desktop.codeReview()
    await see.visible(review.app)
    await see.text(review.frame.getByTestId('review-file-head'), 'fresh.txt')
    await ctx.desktop.closeWindow('code-review')
    // The other row opens its own file, not the first one of the review (UX-107).
    await rows.filter({ hasText: 'notes.txt' }).dblclick()
    await see.visible(review.app)
    await see.text(review.frame.getByTestId('review-file-head'), 'notes.txt')
    await ctx.desktop.closeWindow('code-review')
  })

  it('the buttons above the tree start a chat here and remove a project only when a project is selected (UX-112)', async () => {
    const code = ctx.desktop.code()
    await code.frame.getByTestId('code-mgmt-tab-projects').click()
    const items = code.frame.getByTestId('code-tree-item')
    const project = code.frame.getByTestId('file-tree-root')
    await see.visible(project)
    await project.click()
    await see.eventually(async () => expect(await code.frame.getByTestId('code-tree-remove').isEnabled()).toBe(true))
    await items.filter({ hasText: 'keep.txt' }).click()
    await see.eventually(async () => expect(await code.frame.getByTestId('code-tree-remove').isEnabled()).toBe(false))
    expect(await code.frame.getByTestId('code-ask-selection').isEnabled()).toBe(false) // nothing is selected in the file
    await code.frame.getByTestId('code-tree-new-chat').click()
    const chat = ctx.desktop.window('chat')
    await see.visible(chat.getByTestId('chat-app'))
    await ctx.desktop.closeWindow('chat')
  })
})

/** UX-82: turning on Git asks first. */
describe('Code app: turn on Git', () => {
  let ctx: ConnectedDesktop
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace({ 'a.txt': 'one\n' })
    ctx = await startConnectedDesktop({ title: 'No git desktop', workspace })
  })
  afterAll(async () => {
    await ctx?.app.close()
    await workspace?.remove()
  })

  it('explains Git in plain words, asks, and Cancel is the default', async () => {
    await ctx.desktop.openApp('code')
    const code = ctx.desktop.code()
    await code.frame.getByTestId('code-logs-tab-git').click()
    const note = code.frame.getByTestId('code-git-not-repo')
    await see.text(note, 'hidden folder named .git')
    await see.text(note, 'does not change your files')
    await code.frame.getByTestId('code-git-init').click()
    const box = ctx.desktopPage.getByTestId('message-box')
    await see.visible(box)
    await see.visible(box.getByTestId('message-box-action-turn-on'))
    await ctx.desktopPage.keyboard.press('Enter') // Cancel is the default button
    await see.gone(box)
    await see.visible(note)
  })

  it('Turn on starts Git in the folder', async () => {
    const code = ctx.desktop.code()
    await code.frame.getByTestId('code-git-init').click()
    await ctx.desktopPage.getByTestId('message-box-action-turn-on').click()
    await see.visible(code.frame.getByTestId('code-git-branch'))
    await see.gone(code.frame.getByTestId('code-git-not-repo'))
  })
})
