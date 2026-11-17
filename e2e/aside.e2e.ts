import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createWorkspace, see, startScriptedDesktop, type ScriptedDesktop, type Workspace } from './fixtures'

const INDEX = ['export const answer = 42', 'export const question = "what is it?"', 'export function life(): number {', '  return answer', '}', ''].join('\n')

/** aside.json: the chat pane inside app windows; a conversation in it is kept as a chat when it ends in the pane. */
describe('Chat pane in app windows', () => {
  let ctx: ScriptedDesktop
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace({ 'index.ts': INDEX })
    ctx = await startScriptedDesktop({ script: 'aside', title: 'Aside desktop', workspace })
  })
  afterAll(async () => ctx?.close())

  /** Brings a window to the front through its taskbar button (a click on the button of the focused window would minimise it). */
  async function raise(app: 'code' | 'agent-manager'): Promise<void> {
    if ((await ctx.desktop.window(app).getAttribute('data-focused')) !== 'true') await ctx.desktop.taskbarItem(app).click()
    await see.attribute(ctx.desktop.window(app), 'data-focused', 'true')
  }

  /** Rows of the Task Manager's Chats list after a refresh (every session of the desktop shows there while it lives). */
  async function taskRows(): Promise<number> {
    await raise('agent-manager')
    const manager = ctx.desktop.window('agent-manager')
    await manager.getByTestId('menubar-view').click()
    await ctx.desktopPage.getByTestId('agent-manager-menu-refresh').click()
    return manager.getByTestId('agent-manager-chat').count()
  }

  it('Code: Ctrl+Shift+C opens the pane, and "explain this" is answered about the selected lines of the open file', async () => {
    await ctx.desktop.openApp('code')
    const code = ctx.desktop.code()
    const aside = ctx.desktop.aside('code')
    await see.visible(aside.edgeToggle) // a new window starts collapsed, with the slim toggle on the frame edge
    await see.count(aside.panel, 0)
    await code.openFile('index.ts')
    const lines = code.frame.getByTestId('code-line')
    await see.visible(lines.nth(1))
    await lines.nth(0).dragTo(lines.nth(1))
    await ctx.desktopPage.keyboard.press('Control+Shift+C')
    await see.visible(aside.panel)
    await see.attribute(aside.panel, 'data-role', 'aside')
    await see.visible(aside.blank) // no session yet: it is created by the first message
    await see.visible(aside.chips.first())
    await aside.send('explain this')
    await see.text(aside.userMessages.last(), 'explain this')
    // The scripted agent only answers when the prompt carried appContext with a selection; it names the open file.
    await see.text(aside.agentMessages.last(), 'Short answer: index.ts')
    expect(await aside.sessionId()).toBeGreaterThan(0)
  })

  it('the aside is not a chat while its window has it: no Start menu recent entry, but Task Manager lists the running session', async () => {
    await ctx.desktop.openStart()
    await see.count(ctx.desktopPage.getByTestId('start-menu-recent'), 0)
    await ctx.desktopPage.getByTestId('taskbar-start').click()
    await see.gone(ctx.desktopPage.getByTestId('start-menu'))
    await ctx.desktop.openApp('agent-manager')
    await see.eventually(async () => expect(await taskRows()).toBe(1))
  })

  /** The chats under Start > Recent chats (the menu is closed again afterwards). */
  async function recentChats(): Promise<string[]> {
    await ctx.desktop.openStart()
    const titles = await ctx.desktopPage.getByTestId('start-menu-recent').allInnerTexts()
    await ctx.desktopPage.getByTestId('taskbar-start').click()
    await see.gone(ctx.desktopPage.getByTestId('start-menu'))
    return titles.map((t) => t.trim())
  }

  it('New conversation keeps the conversation under Recent chats and blanks the pane; the next message starts a fresh one', async () => {
    await raise('code')
    const aside = ctx.desktop.aside('code')
    const first = await aside.sessionId()
    expect(first).toBeGreaterThan(0)
    await aside.newConversation.click()
    await see.visible(aside.blank)
    await see.eventually(async () => expect(await recentChats()).toEqual(['explain this']))
    await raise('code')
    await see.count(aside.userMessages, 0)
    await aside.send('explain this')
    await see.text(aside.agentMessages.last(), 'Short answer')
    await see.count(aside.userMessages, 1) // a fresh conversation: the old one lives on as a chat
    const second = await aside.sessionId()
    expect(second).toBeGreaterThan(0)
    expect(second).not.toBe(first)
  })

  it('closing the Code window keeps its pane conversation; Start > Recent chats opens it with its transcript', async () => {
    await raise('code')
    const second = await ctx.desktop.aside('code').sessionId()
    await ctx.desktop.closeWindow('code')
    await see.count(ctx.desktop.windows('code'), 0)
    await see.eventually(async () => expect(await recentChats()).toHaveLength(2))
    await ctx.desktop.openStart()
    const latest = ctx.desktopPage.getByTestId('start-menu-recent').first() // latest activity first: the conversation just kept
    await see.attribute(latest, 'data-session-id', String(second))
    await latest.click()
    const chat = ctx.desktop.window('chat')
    await see.visible(chat)
    await see.attribute(chat.getByTestId('embedded-chat'), 'data-session-id', String(second))
    await see.text(chat.getByTestId('chat-message-user').last(), 'explain this')
    await see.text(chat.getByTestId('chat-message-agent').last(), 'Short answer')
  })

  it('File > Open Recent in the Chat window lists the other chat and opens it', async () => {
    const chat = ctx.desktop.window('chat')
    await chat.getByTestId('menubar-file').click()
    await ctx.desktopPage.getByTestId('chat-menu-recent').hover()
    const items = ctx.desktopPage.getByTestId('chat-menu-recent-item')
    await see.count(items, 1)
    await see.text(items.first(), 'explain this')
    await see.visible(ctx.desktopPage.getByTestId('chat-menu-recent-all'))
    await items.first().click()
    await see.count(ctx.desktop.windows('chat'), 2)
    await see.text(ctx.desktop.window('chat', 1).getByTestId('chat-message-user').last(), 'explain this')
    await ctx.desktop.closeWindow('chat')
    await ctx.desktop.closeWindow('chat')
    await see.count(ctx.desktop.windows('chat'), 0)
  })

  it('Open as a chat window moves the pane conversation to a Chat window', async () => {
    await ctx.desktop.openApp('code')
    const aside = ctx.desktop.aside('code')
    await ctx.desktop.code().openFile('index.ts')
    await aside.edgeToggle.click()
    await see.visible(aside.panel)
    await aside.send('explain this')
    await see.text(aside.agentMessages.last(), 'Short answer')
    const id = await aside.sessionId()
    await aside.panel.getByTestId('embedded-chat-open-window').click()
    const chat = ctx.desktop.window('chat')
    await see.attribute(chat.getByTestId('embedded-chat'), 'data-session-id', String(id))
    await see.text(chat.getByTestId('chat-message-user').last(), 'explain this')
    await see.visible(aside.blank) // the pane starts again, empty
    await ctx.desktop.closeWindow('chat')
    await see.count(ctx.desktop.windows('chat'), 0)
    await ctx.desktop.closeWindow('code')
    await see.count(ctx.desktop.windows('code'), 0)
  })

  it('the agent lists the chats and reopens a closed one with chats_list, chat_read and chat_open', async () => {
    const chat = await ctx.desktop.openApp('chat')
    const window = ctx.desktop.chat()
    await see.visible(window.composer)
    await window.send('list my chats')
    await see.text(window.agentMessage('Your chats'), '"explain this"')
    await see.text(window.agentMessage('Your chats'), '(closed)')
    await window.send('reopen the first chat')
    await see.text(window.agentMessage('Reopened'), 'with its history')
    await see.text(window.agentMessage('Reopened'), 'Short answer') // chat_read returned the transcript of chat 1
    await see.count(ctx.desktop.windows('chat'), 2)
    await see.visible(chat)
    while ((await ctx.desktop.windows('chat').count()) > 0) await ctx.desktop.closeWindow('chat')
  })

  it('Browser: the pane exists, opens from View > Chat pane and offers the page chips', async () => {
    await ctx.desktop.openApp('browser')
    const browser = ctx.desktop.window('browser')
    const aside = ctx.desktop.aside('browser')
    await see.visible(aside.edgeToggle)
    await browser.getByTestId('menubar-view').click()
    await ctx.desktopPage.getByTestId('browser-menu-chat-pane').click()
    await see.attribute(aside.panel, 'data-role', 'aside')
    await see.text(aside.chips.first(), 'Summarise this page')
    await aside.hide.click()
    await see.count(aside.panel, 0)
    await see.visible(aside.edgeToggle)
  })

  it('Chat has no pane: it is the chat', async () => {
    const chat = await ctx.desktop.openApp('chat')
    await see.visible(chat.getByTestId('chat-composer-input'))
    await see.count(chat.getByTestId('chat-pane-toggle'), 0)
    await see.attribute(chat.getByTestId('embedded-chat'), 'data-role', 'chat') // its panel is the chat itself, not an aside
  })
})
