import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createWorkspace, see, startScriptedDesktop, type ScriptedDesktop, type Workspace } from './fixtures'

const INDEX = ['export const answer = 42', 'export const question = "what is it?"', 'export function life(): number {', '  return answer', '}', ''].join('\n')

/** aside.json: the chat pane inside app windows is a short-lived session owned by its window. */
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

  it('the aside is not a chat: no Start menu recent entry, but Task Manager lists the running session', async () => {
    await ctx.desktop.openStart()
    await see.count(ctx.desktopPage.getByTestId('start-menu-recent'), 0)
    await ctx.desktopPage.getByTestId('taskbar-start').click()
    await see.gone(ctx.desktopPage.getByTestId('start-menu'))
    await ctx.desktop.openApp('agent-manager')
    await see.eventually(async () => expect(await taskRows()).toBe(1))
  })

  it('New conversation deletes the session and blanks the pane; the next message starts a fresh one', async () => {
    await raise('code')
    const aside = ctx.desktop.aside('code')
    expect(await aside.sessionId()).toBeGreaterThan(0)
    await aside.newConversation.click()
    await see.visible(aside.blank)
    await see.eventually(async () => expect(await taskRows()).toBe(0))
    await raise('code')
    await see.count(aside.userMessages, 0)
    await aside.send('explain this')
    await see.text(aside.agentMessages.last(), 'Short answer')
    await see.count(aside.userMessages, 1) // the old transcript is gone with its session
    expect(await aside.sessionId()).toBeGreaterThan(0)
    await see.eventually(async () => expect(await taskRows()).toBe(1))
  })

  it('closing the Code window deletes its aside session', async () => {
    await raise('code')
    await ctx.desktop.closeWindow('code')
    await see.count(ctx.desktop.windows('code'), 0)
    await see.eventually(async () => expect(await taskRows()).toBe(0))
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
