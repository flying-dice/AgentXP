import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { protocolEvents, see, startScriptedDesktop, type ScriptedDesktop } from './fixtures'

/**
 * a2ui.json: the agent draws a WinForms surface with agent7.a2ui_render. Where it goes depends on the `target`:
 * inline (in the transcript), sidebar (beside the chat) or window (its own desktop window). The button's action
 * comes back to the chat as a prompt in every case.
 */
describe('scripted agent: A2UI surfaces (a2ui.json)', () => {
  let ctx: ScriptedDesktop

  beforeAll(async () => {
    ctx = await startScriptedDesktop({ script: 'a2ui', title: 'A2UI' })
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
  })
  afterAll(async () => ctx?.close())

  const chat = () => ctx.desktop.chat()
  const surfaceWindow = () => ctx.desktop.window('surface')
  const settled = () => see.attribute(chat().transcript, 'data-running', 'false')
  const confirm = async (button: 'yes' | 'no') => {
    await see.visible(ctx.desktopPage.getByTestId('message-box'))
    await ctx.desktopPage.getByTestId('message-box').getByTestId(`dialog-button-${button}`).click()
  }

  describe('inline', () => {
    it('renders the surface in the chat transcript with its controls and opens no window', async () => {
      await chat().send('Show me a form')
      const surface = chat().transcript.getByTestId('a2ui-surface').first()
      await see.visible(surface)
      await see.visible(surface.getByTestId('a2ui-textbox'))
      await see.visible(surface.getByTestId('a2ui-checkbox'))
      await see.visible(surface.getByTestId('a2ui-button').filter({ hasText: 'Send' }))
      await see.visible(chat().agentMessage('The form is on screen.'))
      await settled()
      expect(await chat().surfaces.count()).toBe(1)
      expect(await ctx.desktop.windows('surface').count()).toBe(0)
      await see.attribute(chat().surfaceRows.first(), 'data-target', 'inline')
      expect(await chat().sidebar.count()).toBe(0)
    })

    it('typing and clicking Send returns the action (with the data model) to the agent, which answers', async () => {
      const surface = chat().transcript.getByTestId('a2ui-surface').first()
      await surface.getByTestId('a2ui-textbox').fill('Ann')
      await surface.getByTestId('a2ui-checkbox').click()
      await surface.getByTestId('a2ui-button').filter({ hasText: 'Send' }).click()
      await see.visible(chat().agentMessage('Got action send from send on contact; hello Ann.'))
      await see.text(surface.getByTestId('a2ui-sent'), 'Sent. The agent answered: Got action send from send on contact')
      await settled()
      // The action is a hidden prompt: no user message is added for it.
      expect(await chat().userMessages.count()).toBe(1)

      const acp = await protocolEvents(ctx.desktopPage, { source: 'acp', sessionId: await chat().sessionId() })
      const prompts = acp.filter((e) => e.name === 'session/prompt')
      expect(prompts).toHaveLength(2)
      expect(prompts[1].payload).toContain('triggered the action \\"send\\"')
      expect(prompts[1].payload).toContain('\\"subscribe\\": true')
      await see.attribute(chat().toolCalls.first(), 'data-status', 'done')
    })
  })

  describe('sidebar', () => {
    it('shows the surface in a side panel of the chat, with a tab and a chat row', async () => {
      await chat().send('Open a sidebar please')
      await see.visible(chat().sidebar)
      await see.text(chat().sidebarTabs.first(), 'Notes') // the tab and the row use one name: the title the agent gave (UX-216)
      await see.visible(chat().sidebar.getByTestId('a2ui-textbox'))
      await see.visible(chat().agentMessage('The sidebar is open.'))
      await settled()
      await see.attribute(chat().surfaceRow('Notes'), 'data-state', 'open')
      await see.attribute(chat().surfaceRow('Notes'), 'data-target', 'sidebar')
      // The row names what the agent opened and where it is.
      await see.text(chat().surfaceRow('Notes'), 'The agent opened a form: Notes.')
      await see.text(chat().surfaceRow('Notes').getByTestId('chat-surface-where'), "It is in the sidebar 'Notes'.")
      expect(await ctx.desktop.windows('surface').count()).toBe(0)
    })

    it('an action from the sidebar goes back to the chat', async () => {
      await chat().sidebar.getByTestId('a2ui-textbox').fill('Bob')
      await chat().sidebar.getByTestId('a2ui-button').filter({ hasText: 'Send' }).click()
      await see.visible(chat().agentMessage('Got action send from send on notes; hello Bob.'))
      await see.text(chat().sidebar.getByTestId('a2ui-sent'), 'Sent. The agent answered: Got action send from send on notes')
      await settled()
      // UX-216: the line stays under the form until the person edits a field again.
      await see.visible(chat().sidebar.getByTestId('a2ui-sent'))
      await chat().sidebar.getByTestId('a2ui-textbox').fill('Carol')
      await see.count(chat().sidebar.getByTestId('a2ui-sent'), 0)
    })

    it('closing the tab hides the sidebar; Open on the chat row brings it back', async () => {
      await chat().sidebar.getByTestId('chat-sidebar-tab-close').click()
      await see.gone(chat().sidebar)
      await see.attribute(chat().surfaceRow('Notes'), 'data-state', 'closed')
      await chat().surfaceRow('Notes').getByTestId('chat-surface-open').click()
      await see.visible(chat().sidebar)
      await see.attribute(chat().surfaceRow('Notes'), 'data-state', 'open')
    })
  })

  describe('window', () => {
    it('opens the surface in its own desktop window next to the chat, with a chat row', async () => {
      await chat().send('Open a window please')
      await see.visible(surfaceWindow())
      await see.visible(surfaceWindow().getByTestId('a2ui-surface'))
      await see.visible(surfaceWindow().getByTestId('a2ui-textbox'))
      await see.visible(surfaceWindow().getByTestId('a2ui-button').filter({ hasText: 'Send' }))
      await see.text(surfaceWindow().getByTestId('window-title'), 'Board')
      await see.visible(chat().agentMessage('The window is open.'))
      await see.visible(chat().agentMessage('Shown in its own window "Board"'))
      await settled()
      await see.attribute(chat().surfaceRow('Board'), 'data-state', 'open')
      await see.attribute(chat().surfaceRow('Board'), 'data-target', 'window')
      await see.text(chat().surfaceRow('Board').getByTestId('chat-surface-where'), "It is in the window 'Board'.")
      // The window did not take focus from the chat the user is working in.
      await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    })

    it('typing and Send in the window answers in the chat', async () => {
      await surfaceWindow().getByTestId('a2ui-textbox').fill('Cy')
      await surfaceWindow().getByTestId('a2ui-button').filter({ hasText: 'Send' }).click()
      await see.visible(chat().agentMessage('Got action send from send on board; hello Cy.'))
      await settled()
    })

    it('closing the window by its title bar hides the surface: the chat row says Closed', async () => {
      await ctx.desktop.closeWindow('surface')
      await see.gone(surfaceWindow())
      await see.attribute(chat().surfaceRow('Board'), 'data-state', 'closed')
    })

    it('an update by the agent does not reopen it; the agent is told, and Open shows the updated data', async () => {
      await chat().send('Please update the board')
      await see.visible(chat().agentMessage('The user closed this window; it updates in the background.'))
      await settled()
      expect(await ctx.desktop.windows('surface').count()).toBe(0)
      await chat().surfaceRow('Board').getByTestId('chat-surface-open').click()
      await see.visible(surfaceWindow())
      await see.eventually(async () => expect(await surfaceWindow().getByTestId('a2ui-textbox').inputValue()).toBe('Updated by the agent'))
      await see.attribute(chat().surfaceRow('Board'), 'data-state', 'open')
      expect(await ctx.desktop.windows('surface').count()).toBe(1)
    })

    it('Close on the chat row closes the window; Open again re-opens exactly one', async () => {
      await chat().surfaceRow('Board').getByTestId('chat-surface-close').click()
      await see.gone(surfaceWindow())
      await chat().surfaceRow('Board').getByTestId('chat-surface-open').click()
      await see.visible(surfaceWindow())
      await chat().surfaceRow('Board').getByTestId('chat-surface-open').click() // focuses, no second window
      expect(await ctx.desktop.windows('surface').count()).toBe(1)
    })
  })

  describe('move to', () => {
    it('relocates a surface: window -> sidebar -> inline -> window', async () => {
      const row = () => chat().surfaceRow('Board')
      await row().getByTestId('chat-surface-move').click()
      await ctx.desktopPage.getByTestId('chat-surface-move-sidebar').click()
      await see.gone(surfaceWindow())
      await see.count(chat().sidebarTabs, 2)
      await see.attribute(row(), 'data-target', 'sidebar')

      await row().getByTestId('chat-surface-move').click()
      await ctx.desktopPage.getByTestId('chat-surface-move-inline').click()
      await see.count(chat().sidebarTabs, 1)
      await see.attribute(chat().surfaceRows.last(), 'data-target', 'inline')
      // The transcript is windowed: the first form, far above, is not in the DOM; the one that just moved in is.
      await see.visible(chat().transcript.getByTestId('a2ui-surface').last())

      await chat().surfaceRows.last().getByTestId('chat-surface-move').click()
      await ctx.desktopPage.getByTestId('chat-surface-move-window').click()
      await see.visible(surfaceWindow())
      await see.attribute(row(), 'data-target', 'window')
    })
  })

  describe('delete', () => {
    it('Delete asks, then removes the surface and its window', async () => {
      await chat().surfaceRow('Board').getByTestId('chat-surface-delete').click()
      await confirm('no')
      await see.visible(surfaceWindow())
      await chat().surfaceRow('Board').getByTestId('chat-surface-delete').click()
      await confirm('yes')
      await see.gone(surfaceWindow())
      await see.count(chat().surfaceRow('Board'), 0)
      expect(await ctx.desktop.windows('surface').count()).toBe(0)
    })
  })
})
