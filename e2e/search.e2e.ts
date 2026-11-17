import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { allowFileWrites, createWorkspace, protocolEvents, see, setWindowSize, shot, startScriptedDesktop, type ScriptedDesktop, type Workspace } from './fixtures'

const INDEX = 'export const answer = 42\nexport const needle = 1\nexport const other = 3\n'

/**
 * Finding and searching files in the apps: the Code app's Search tab (find in files) and Explorer's Search Companion
 * (find files by name and contents), by hand and by the agent (search.json: fs_find, code_search, code_read, code_edit,
 * code_write), so the agent's work shows on the desktop.
 */
describe('search in Code and Explorer', () => {
  let ctx: ScriptedDesktop
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace({
      'README.md': '# Search demo\nThe needle is in src.\n',
      'src/index.ts': INDEX,
      'src/util.ts': 'export const util = true\n',
      'docs/notes.md': 'nothing to see\n'
    })
    ctx = await startScriptedDesktop({ script: 'search', title: 'Search desktop', workspace })
  })
  /**
   * The agent's windows come to the front while the focus stays in the chat you typed in (UX-55), so they can cover its
   * Send button: type and press Enter, as a person does, instead of clicking it.
   */
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

  it('the agent finds files: Explorer\'s Search Companion shows its criteria and results', async () => {
    // The script opens an Explorer of its own (desktop_open_app); with none open there is exactly one to look at.
    if ((await ctx.desktop.window('explorer').getAttribute('data-focused')) !== 'true') await ctx.desktop.taskbarItem('explorer').click()
    await see.attribute(ctx.desktop.window('explorer'), 'data-focused', 'true')
    await ctx.desktop.closeWindow('explorer')
    await see.count(ctx.desktop.windows('explorer'), 0)
    await ctx.desktop.openApp('chat')
    const chat = ctx.desktop.chat()
    await chat.send('please find files with the needle')
    await see.visible(chat.agentMessage('Found the files'))
    const explorer = ctx.desktop.explorer()
    await see.visible(explorer.searchPane)
    await see.eventually(async () => expect(await explorer.searchName.inputValue()).toBe('*.ts'))
    expect(await explorer.searchContaining.inputValue()).toBe('needle')
    await see.text(explorer.searchStatus, '1 file found')
    await see.visible(explorer.searchResult('index.ts'))
    await shot(ctx.desktopPage, 'search-07-agent-fs-find')
  })

  it('the agent was told how to work on the desktop: in its system prompt and in the briefing of the first prompt', async () => {
    const sessionId = await ctx.desktop.chat().sessionId()
    const acp = await protocolEvents(ctx.desktopPage, { source: 'acp', sessionId })
    const opened = acp.find((e) => e.direction === 'out' && e.name.startsWith('session/new'))
    expect(opened, 'session/new sent to the agent').toBeDefined()
    const params = (JSON.parse(opened!.payload) as { params: { _meta?: { systemPrompt?: { append?: string } } } }).params
    expect(params._meta?.systemPrompt?.append).toContain('# Working on the AgentXP desktop')
    expect(params._meta?.systemPrompt?.append).toContain('Prefer AgentXP tools')
    const prompt = acp.find((e) => e.direction === 'out' && e.name.startsWith('session/prompt'))
    expect(prompt?.payload).toContain('agentxp://briefing')
    expect(prompt?.payload).toContain('Prefer AgentXP tools')
  })

  it('the agent searches and reads code: the Search tab shows its search and Code opens the lines it read', async () => {
    const chat = ctx.desktop.chat()
    await sendToChat('search code for the needle')
    await see.visible(chat.agentMessage('Searched and read'))
    const code = ctx.desktop.code()
    await see.attribute(code.searchTab, 'aria-selected', 'true')
    expect(await code.searchQuery.inputValue()).toBe('needle')
    await see.text(code.searchSummary, '2 results in 2 files')
    await see.attribute(code.editor, 'data-path', /src\\index\.ts$/)
    await shot(ctx.desktopPage, 'search-08-agent-code-search-read')
  })

  it('the agent edits code: the file changes on disk, Code shows it, and both changes are listed', async () => {
    await allowFileWrites(ctx.desktopPage)
    const chat = ctx.desktop.chat()
    await sendToChat('edit code please')
    await see.visible(chat.agentMessage('Edited'))
    await see.eventually(async () => expect(await readFile(join(workspace.path, 'src/index.ts'), 'utf8')).toBe(INDEX.replace('needle = 1', 'needle = 2')))
    expect(await readFile(join(workspace.path, 'src/fresh.ts'), 'utf8')).toBe('export const fresh = true\n')
    const code = ctx.desktop.code()
    await see.visible(code.tab('fresh.ts'))
    await see.attribute(code.editor, 'data-path', /src\\fresh\.ts$/)
    await code.showChanges()
    await see.visible(code.changes.filter({ hasText: 'index.ts' }))
    await see.visible(code.changes.filter({ hasText: 'fresh.ts' }))
    await shot(ctx.desktopPage, 'search-09-agent-edits')
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
    // In a small screen Code covers Explorer: minimise it, then Explorer comes forward.
    await ctx.desktop.minimizeWindow('code')
    await ctx.desktop.focusWindow('explorer')
    await ctx.desktop.explorer().find({ name: '*.md' })
    await see.visible(ctx.desktop.explorer().searchResult('README.md'))
    await shot(ctx.desktopPage, 'search-06-explorer-small')
    await ctx.desktop.explorer().closeSearch()
    await setWindowSize(ctx.app, ctx.desktopPage, before.width, before.height)
    await ctx.desktop.taskbarItem('code').click()
    await see.attribute(ctx.desktop.window('code'), 'data-window-state', 'normal')
  })
})
