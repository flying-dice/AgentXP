import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, it } from 'vitest'
import { reconnectDesktop, see, startConnectedDesktop, type ConnectedDesktop } from './fixtures'

/** Teams and Team Chat: make, edit and delete profiles and teams, start a chat room, post in it, and keep it all over a restart. */
describe('Teams and Team Chat', () => {
  let userData: string
  let ctx: ConnectedDesktop

  beforeAll(async () => {
    userData = await mkdtemp(join(tmpdir(), 'a7-e2e-teams-'))
    ctx = await startConnectedDesktop({ title: 'Teams desktop', userData })
  })
  afterAll(async () => {
    await ctx?.app.close()
    await rm(userData, { recursive: true, force: true })
  })

  const frame = () => ctx.desktop.window('teams')
  const rows = () => frame().getByTestId('teams-row')
  const ok = (dialog: string) => frame().getByTestId(dialog).getByTestId('dialog-button-ok').click()
  const confirmDelete = async () => {
    await frame().getByTestId('teams-delete').click()
    await ctx.desktopPage.getByTestId('message-box').getByTestId('dialog-button-yes').click()
  }

  it('New profile checks the name and saves a profile', async () => {
    await ctx.desktop.openApp('teams')
    await see.visible(frame().getByTestId('teams-app'))
    await frame().getByTestId('teams-tab-profiles').click()
    await frame().getByTestId('teams-new').click()
    await see.visible(frame().getByTestId('profile-dialog'))
    await ok('profile-dialog')
    await see.text(frame().getByTestId('profile-dialog-problem'), /name/i)
    await frame().getByTestId('profile-dialog-name').fill('Reviewer')
    await frame().getByTestId('profile-dialog-instructions').fill('Review every change.')
    await ok('profile-dialog')
    await see.gone(frame().getByTestId('profile-dialog'))
    await see.count(rows(), 1)
    await see.text(rows().first(), 'Reviewer')
  })

  it('Edit renames the profile, and a second profile can be added', async () => {
    await rows().first().click()
    await frame().getByTestId('teams-edit').click()
    await see.visible(frame().getByTestId('profile-dialog'))
    await frame().getByTestId('profile-dialog-name').fill('Lead reviewer')
    await ok('profile-dialog')
    await see.text(rows().first(), 'Lead reviewer')
    await frame().getByTestId('teams-new').click()
    await frame().getByTestId('profile-dialog-name').fill('Scratch')
    await frame().getByTestId('profile-dialog-instructions').fill('Throw away.')
    await ok('profile-dialog')
    await see.count(rows(), 2)
  })

  it('Delete removes a profile after asking', async () => {
    await rows().filter({ hasText: 'Scratch' }).click()
    await confirmDelete()
    await see.count(rows(), 1)
    await see.text(rows().first(), 'Lead reviewer')
  })

  it('New team saves a team with a member, and Edit changes it', async () => {
    await frame().getByTestId('teams-tab-teams').click()
    await frame().getByTestId('teams-new').click()
    await see.visible(frame().getByTestId('team-dialog'))
    await frame().getByTestId('team-dialog-name').fill('Feature team')
    await frame().getByTestId('team-dialog-instructions').fill('Ship small changes.')
    await frame().getByTestId('team-dialog-member-check').first().click()
    await ok('team-dialog')
    await see.gone(frame().getByTestId('team-dialog'))
    await see.count(rows(), 1)
    await see.text(rows().first(), 'Feature team')
    await rows().first().click()
    await frame().getByTestId('teams-edit').click()
    await frame().getByTestId('team-dialog-name').fill('Release team')
    await ok('team-dialog')
    await see.text(rows().first(), 'Release team')
  })

  it('Start chat room opens Team Chat, where a posted message shows', async () => {
    await rows().first().click()
    await see.enabled(frame().getByTestId('teams-start-room'))
    await frame().getByTestId('teams-start-room').click()
    // Cancel the folder question: the room still opens, without a folder.
    await ctx.desktopPage.getByTestId('folder-browser-dialog').getByTestId('dialog-button-cancel').click()
    const room = ctx.desktop.window('team-chat')
    await see.visible(room.getByTestId('team-chat-app'))
    await see.count(room.getByTestId('team-chat-member'), 1)
    await see.visible(room.getByTestId('team-chat-empty'))
    await room.getByTestId('team-chat-input').fill('Hello team')
    await room.getByTestId('team-chat-send').click()
    await see.text(room.getByTestId('team-chat-message').first(), 'Hello team')
    await see.text(room.getByTestId('team-chat-message-author').first(), 'You')
  })

  it('keeps profiles, teams and the room with its messages over a restart', async () => {
    await ctx.app.close()
    ctx = await reconnectDesktop(userData, 'Teams desktop')
    // The room window comes back with the message; it sits on top of Teams, so it is closed after the check.
    if ((await ctx.desktop.windows('team-chat').count()) > 0) {
      await see.text(ctx.desktop.window('team-chat').getByTestId('team-chat-message').first(), 'Hello team')
      await ctx.desktop.closeWindow('team-chat')
    }
    if ((await ctx.desktop.windows('teams').count()) === 0) await ctx.desktop.openApp('teams')
    await see.text(rows().first(), 'Release team')
    await frame().getByTestId('teams-tab-profiles').click()
    await see.text(rows().first(), 'Lead reviewer')
    await frame().getByTestId('teams-tab-rooms').click()
    await see.count(rows(), 1)
    await rows().first().click()
    await frame().getByTestId('teams-open-room').click()
    const room = ctx.desktop.window('team-chat')
    await see.text(room.getByTestId('team-chat-message').first(), 'Hello team')
  })

  it('Delete removes the room and then the team', async () => {
    await ctx.desktop.closeWindow('team-chat')
    await rows().first().click()
    await confirmDelete()
    await see.count(rows(), 0)
    await frame().getByTestId('teams-tab-teams').click()
    await rows().first().click()
    await confirmDelete()
    await see.count(rows(), 0)
  })
})
