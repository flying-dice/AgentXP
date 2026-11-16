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
})
