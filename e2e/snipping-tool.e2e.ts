import { afterAll, beforeAll, describe, it } from 'vitest'
import { see, startConnectedDesktop, type ConnectedDesktop } from './fixtures'

/** Snipping Tool: take a full-screen snip, cancel a rectangular one, and send a snip to the chat pane as a saved picture. */
describe('Snipping Tool', () => {
  let ctx: ConnectedDesktop

  beforeAll(async () => {
    ctx = await startConnectedDesktop({ title: 'Snipping desktop' })
  })
  afterAll(async () => ctx?.app.close())

  const app = () => ctx.desktop.window('snipping-tool').getByTestId('snipping-tool-app')

  it('starts without a snip, and Full-screen Snip captures the desktop', async () => {
    await ctx.desktop.openApp('snipping-tool')
    await see.visible(app().getByTestId('snipping-tool-empty'))
    await app().getByTestId('menubar-file').click()
    await ctx.desktopPage.getByTestId('snipping-tool-menu-full').click()
    await see.visible(app().getByTestId('snipping-tool-image'))
    await see.text(app().getByTestId('snipping-tool-status'), 'Captured the whole desktop.')
  })

  it('New starts a rectangular snip, and Esc cancels it without losing the last snip', async () => {
    await app().getByTestId('snipping-tool-new').click()
    await see.text(app().getByTestId('snipping-tool-status'), 'Drag to select the area to capture.')
    await ctx.desktopPage.keyboard.press('Escape')
    await see.text(app().getByTestId('snipping-tool-status'), 'Snip cancelled.')
    await see.visible(app().getByTestId('snipping-tool-image'))
  })

  it('Send to chat saves the snip as a picture on C: and opens the chat pane with it', async () => {
    await app().getByTestId('snipping-tool-send-chat').click()
    await see.text(app().getByTestId('snipping-tool-status'), /Sent to chat\. The picture is saved as C:\\Users\\Agent\\Pictures\\Snips\\.+\.png\./)
    await see.visible(ctx.desktop.window('snipping-tool').getByTestId('embedded-chat'))
  })
})
