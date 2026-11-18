import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { allowFileWrites, createWorkspace, protocolEvents, see, setWindowSize, shot, startScriptedDesktop, type ScriptedDesktop, type Workspace } from './fixtures'

const INDEX = 'export const answer = 42\nexport const needle = 1\nexport const other = 3\n'

/**
 * Finding and searching files in the apps: the Code app's Search tab (find in files) and Explorer's Search Companion
 * (find files by name and contents) by hand; and the agent's Work (search.json: fs_find, code_search, code_read,
 * code_edit, code_write), which opens nothing: its chat rows say where to look (Show in Code, Show diff), and a file
 * that Code already shows reloads in place (docs/AGENT_PRESENCE.md).
 */
describe('search in Code and Explorer', () => {
  let ctx: ScriptedDesktop
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace({
      'README.md': '# Search demo\nThe needle is in src.\n',
      'src/index.ts': INDEX,
      'src/util.ts': 'export const util = true\n',
      'docs/notes.md': 'nothing to see\n',
      // A line that makes a nested-repeat pattern such as (a+)+$ backtrack for minutes.
      'docs/slow.log': `${'a'.repeat(40)}b\n`
    })
    ctx = await startScriptedDesktop({ script: 'search', title: 'Search desktop', workspace })
  })
  /** Type and press Enter, as a person does. */
  async function sendToChat(text: string): Promise<void> {
    const chat = ctx.desktop.chat()
    await chat.composer.fill(text)
    await chat.composer.press('Enter')
  }

  afterAll(async () => {
    await ctx?.close()
    await workspace?.remove()
  })

  it('Code: find in files lists the matching lines, and a result opens the file at its line', async () => {
    await ctx.desktop.openApp('code')
    const code = ctx.desktop.code()
    await code.findInFiles('needle')
    await see.attribute(code.search, 'data-searching', 'false')
    await see.text(code.searchSummary, '2 results in 2 files')
    await see.count(code.searchResults, 2)
    await see.count(code.searchFiles, 2)
    await shot(ctx.desktopPage, 'search-01-code-results')
    const inIndex = code.searchResults.filter({ hasText: 'needle = 1' })
    await see.attribute(inIndex, 'data-line', '2')
    await inIndex.click()
    await see.attribute(code.editor, 'data-path', /src\\index\.ts$/)
    await see.visible(code.tab('index.ts'))
    await shot(ctx.desktopPage, 'search-02-code-result-opened')
  })

  it('Code: Files to include narrows the search, and a bad regular expression says why', async () => {
    const code = ctx.desktop.code()
    await code.searchInclude.fill('*.md')
    await code.findInFiles('needle')
    await see.text(code.searchSummary, '1 result in 1 file')
    await see.attribute(code.searchResults, 'data-path', /README\.md$/)
    await code.searchInclude.fill('')
    await code.frame.getByTestId('code-search-regex').click()
    await see.attribute(code.frame.getByTestId('code-search-regex'), 'aria-checked', 'true')
    await code.findInFiles('(')
    await see.text(code.searchSummary, 'Not a valid regular expression')
    await code.frame.getByTestId('code-search-regex').click()
    await see.attribute(code.frame.getByTestId('code-search-regex'), 'aria-checked', 'false')
  })

  it('Code: Files to include takes the globs agents write, and a runaway regular expression stops with a message', async () => {
    const code = ctx.desktop.code()
    await code.searchInclude.fill('src/**/*.ts')
    await code.findInFiles('export')
    await see.text(code.searchSummary, '4 results in 2 files')
    await code.searchInclude.fill('*.{md,log}')
    await code.findInFiles('needle')
    await see.text(code.searchSummary, '1 result in 1 file')
    await shot(ctx.desktopPage, 'search-10-code-globs')
    await code.searchInclude.fill('*.log')
    await code.frame.getByTestId('code-search-regex').click()
    await code.findInFiles('(a+)+$')
    // The app stays responsive: the search stops after its time limit and says why.
    await see.text(code.searchSummary, 'takes too long')
    await shot(ctx.desktopPage, 'search-11-code-regex-timeout')
    await code.frame.getByTestId('code-search-regex').click()
    await code.searchInclude.fill('')
  })

  it('Explorer: the Search Companion finds files by name and by a word in the file; Back closes it', async () => {
    await ctx.desktop.openApp('explorer')
    const explorer = ctx.desktop.explorer()
    await explorer.find({ containing: 'needle' })
    await see.attribute(explorer.searchPane, 'data-searching', 'false')
    await see.text(explorer.searchStatus, '2 files found')
    await see.count(explorer.searchResults, 2)
    await explorer.find({ name: '*.ts', containing: 'needle' })
    await see.text(explorer.searchStatus, '1 file found')
    await see.visible(explorer.searchResult('index.ts'))
    await see.text(explorer.searchResult('index.ts'), 'src')
    await shot(ctx.desktopPage, 'search-03-explorer-companion')
    await explorer.closeSearch()
    await see.gone(explorer.searchPane)
    await see.visible(explorer.frame.getByTestId('explorer-nav'))
  })

  it('keyboard: Ctrl+F opens the Search tab of Code with the cursor in the box; F3 opens and closes the Search Companion', async () => {
    const explorer = ctx.desktop.explorer()
    await ctx.desktop.focusWindow('explorer')
    await explorer.frame.getByTestId('explorer-tree-computer').click()
    await ctx.desktopPage.keyboard.press('F3')
    await see.visible(explorer.searchPane)
    await explorer.searchName.fill('util')
    await explorer.searchContaining.fill('') // the criteria of the last search stay, as in XP
    await explorer.searchName.press('Enter')
    await see.visible(explorer.searchResult('util.ts'))
    await ctx.desktopPage.keyboard.press('F3')
    await see.gone(explorer.searchPane)

    const code = ctx.desktop.code()
    await ctx.desktop.focusWindow('code')
    await code.frame.getByTestId('code-mgmt-tab-projects').click()
    await code.editor.click()
    await ctx.desktopPage.keyboard.press('Control+f')
    await see.attribute(code.searchTab, 'aria-selected', 'true')
    await see.eventually(async () => expect(await code.searchQuery.evaluate((el) => el === document.activeElement)).toBe(true))
  })

  it('the agent finds files: nothing opens and nothing takes the focus', async () => {
    for (const app of ['explorer', 'code'] as const) {
      // Bring it forward first (a window behind another cannot be clicked), then close it.
      if ((await ctx.desktop.window(app).getAttribute('data-focused')) !== 'true') await ctx.desktop.taskbarItem(app).click()
      await see.attribute(ctx.desktop.window(app), 'data-focused', 'true')
      await shot(ctx.desktopPage, `search-debug-${app}`)
      await ctx.desktop.closeWindow(app)
    }
    await see.count(ctx.desktop.windows('explorer'), 0)
    await see.count(ctx.desktop.windows('code'), 0)
    await ctx.desktop.openApp('chat')
    const chat = ctx.desktop.chat()
    await chat.send('please find files with the needle')
    await see.visible(chat.agentMessage('Found the files'))
    await see.text(chat.agentMessage('Found the files'), 'index.ts')
    await see.count(ctx.desktop.windows('explorer'), 0)
    await see.count(ctx.desktop.windows('code'), 0)
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    await see.visible(chat.toolCalls.filter({ hasText: 'Find files' }))
    await shot(ctx.desktopPage, 'search-07-agent-fs-find-nothing-opens')
  })

  it('the agent was told how to work on the desktop: in its system prompt and in the briefing of the first prompt', async () => {
    const sessionId = await ctx.desktop.chat().sessionId()
    const acp = await protocolEvents(ctx.desktopPage, { source: 'acp', sessionId })
    const opened = acp.find((e) => e.direction === 'out' && e.name.startsWith('session/new'))
    expect(opened, 'session/new sent to the agent').toBeDefined()
    const params = (JSON.parse(opened!.payload) as { params: { _meta?: { systemPrompt?: { append?: string } } } }).params
    expect(params._meta?.systemPrompt?.append).toContain('# Working on the AgentXP desktop')
    expect(params._meta?.systemPrompt?.append).toContain('Work quietly')
    const prompt = acp.find((e) => e.direction === 'out' && e.name.startsWith('session/prompt'))
    expect(prompt?.payload).toContain('agentxp://briefing')
    expect(prompt?.payload).toContain('Work quietly')
  })

  it('the agent searches and reads code: nothing opens; Show in Code on the read step opens the lines it read', async () => {
    const chat = ctx.desktop.chat()
    await sendToChat('search code for the needle')
    await see.visible(chat.agentMessage('Searched and read'))
    await see.count(ctx.desktop.windows('code'), 0)
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    await shot(ctx.desktopPage, 'search-08-agent-code-search-read-nothing-opens')
    const read = chat.toolCalls.filter({ hasText: 'Read a file' })
    await see.visible(read.getByTestId('tool-call-show-code'))
    await see.visible(chat.toolCalls.filter({ hasText: 'Search the files' }).getByTestId('tool-call-show-code'))
    await read.getByTestId('tool-call-show-code').click()
    const code = ctx.desktop.code()
    await see.attribute(ctx.desktop.window('code'), 'data-focused', 'true') // the operator asked: Code comes forward
    await see.attribute(code.editor, 'data-path', /src\\index\.ts$/)
    await see.attribute(code.editor, 'data-highlight', '2-3')
    await shot(ctx.desktopPage, 'search-13-show-in-code-lines')
  })

  it('the agent edits the file Code shows: it reloads in place, no tab switch, no focus; Show diff opens the change', async () => {
    await allowFileWrites(ctx.desktopPage)
    const code = ctx.desktop.code()
    await see.attribute(code.editor, 'data-path', /src\\index\.ts$/)
    await ctx.desktop.taskbarItem('chat').click()
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    const chat = ctx.desktop.chat()
    await sendToChat('edit code please')
    await see.visible(chat.agentMessage('Edited'))
    await see.eventually(async () => expect(await readFile(join(workspace.path, 'src/index.ts'), 'utf8')).toBe(INDEX.replace('needle = 1', 'needle = 2')))
    expect(await readFile(join(workspace.path, 'src/fresh.ts'), 'utf8')).toBe('export const fresh = true\n')
    // Live where open: the active file reloads with the change; the new file is not opened, the focus stays in the chat.
    await see.text(code.editor, 'needle = 2')
    await see.attribute(code.editor, 'data-path', /src\\index\.ts$/)
    await see.count(code.tab('fresh.ts'), 0)
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    await see.attribute(ctx.desktop.window('code'), 'data-focused', 'false')
    await shot(ctx.desktopPage, 'search-09-agent-edits-in-place')
    await chat.toolCalls.filter({ hasText: 'Write a file' }).getByTestId('tool-call-show-diff').click()
    await see.attribute(ctx.desktop.window('code'), 'data-focused', 'true')
    await see.attribute(code.editor, 'data-path', /src\\fresh\.ts$/)
    await code.showChanges()
    await see.visible(code.changes.filter({ hasText: 'index.ts' }))
    await see.visible(code.changes.filter({ hasText: 'fresh.ts' }))
    await shot(ctx.desktopPage, 'search-14-show-diff')
  })

  it('the agent cannot damage a file that is not UTF-8: code_edit refuses it and the bytes stay', async () => {
    const latin1 = Buffer.from([0x63, 0x61, 0x66, 0xe9, 0x0a, 0x6f, 0x6e, 0x65, 0x0a]) // "café\none\n" in Windows-1252
    await writeFile(join(workspace.path, 'docs/legacy.txt'), latin1)
    const chat = ctx.desktop.chat()
    await sendToChat('edit legacy please')
    await see.text(chat.agentMessage('Refused'), 'not UTF-8 text')
    expect(Buffer.compare(await readFile(join(workspace.path, 'docs/legacy.txt')), latin1)).toBe(0)
    await shot(ctx.desktopPage, 'search-12-agent-edit-refused')
  })

  it('both search panes fit a maximized window and a small one', async () => {
    const code = ctx.desktop.code()
    await ctx.desktop.window('code').getByTestId('window-maximize').click()
    await code.findInFiles('export')
    await see.text(code.searchSummary, '5 results in 3 files') // index.ts, util.ts and the agent's fresh.ts
    await shot(ctx.desktopPage, 'search-04-code-maximized')
    await ctx.desktop.window('code').getByTestId('window-maximize').click()
    const before = await ctx.desktopPage.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
    await setWindowSize(ctx.app, ctx.desktopPage, 900, 600)
    await ctx.desktop.focusWindow('code')
    await shot(ctx.desktopPage, 'search-05-code-small')
    // In a small screen Code covers Explorer: minimise it, then open Explorer (the agent never opened one).
    await ctx.desktop.minimizeWindow('code')
    await ctx.desktop.openApp('explorer')
    await ctx.desktop.explorer().find({ name: '*.md' })
    await see.visible(ctx.desktop.explorer().searchResult('README.md'))
    await shot(ctx.desktopPage, 'search-06-explorer-small')
    await ctx.desktop.explorer().closeSearch()
    await setWindowSize(ctx.app, ctx.desktopPage, before.width, before.height)
    await ctx.desktop.taskbarItem('code').click()
    await see.attribute(ctx.desktop.window('code'), 'data-window-state', 'normal')
  })
})
