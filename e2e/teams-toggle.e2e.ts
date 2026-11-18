import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import type { AgentXPApi } from '../src/shared/ipc'
import { reconnectDesktop, see, setWindowSize, shot, startConnectedDesktop } from './fixtures'

it('Teams defaults off, opts in, and preserves hidden windows across restarts', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'a7-teams-toggle-'))
  let ctx = await startConnectedDesktop({ title: 'Teams toggle', userData })
  try {
    await ctx.desktop.openStart()
    await see.gone(ctx.desktopPage.getByTestId('start-menu-item-teams'))
    await shot(ctx.desktopPage, 'teams-disabled-normal')
    await ctx.desktopPage.getByTestId('connbar-maximize').click()
    await ctx.desktop.openStart()
    await shot(ctx.desktopPage, 'teams-disabled-maximized')
    await ctx.desktopPage.getByTestId('connbar-maximize').click()
    await setWindowSize(ctx.app, ctx.desktopPage, 900, 600)
    await ctx.desktop.openStart()
    await shot(ctx.desktopPage, 'teams-disabled-small')
    await ctx.desktopPage.keyboard.press('Escape')
    await see.gone(ctx.desktopPage.getByTestId('start-menu'))
    const blocked = await ctx.desktopPage.evaluate(async (desktopId) => {
      const api = (window as unknown as { agentxp: AgentXPApi }).agentxp
      const state = await api.desktop.current()
      const errors: string[] = []
      for (const app of ['teams', 'team-chat'] as const) {
        try { await api.desktop.openWindow({ desktopId, app, roomId: 1 }) }
        catch (e) { errors.push(String(e)) }
      }
      try { await api.rooms.create(desktopId, 1) } catch (e) { errors.push(String(e)) }
      return { errors, tools: state?.tools }
    }, ctx.desktopId)
    expect(blocked.errors).toHaveLength(3)
    expect(blocked.errors.every((e) => e.includes('Teams is disabled'))).toBe(true)
    expect(blocked.tools).not.toContain('teams')
    expect(blocked.tools).not.toContain('rooms')
    // Scheduler still loads the shared profile/team registry while Teams is off.
    await ctx.desktop.openApp('task-scheduler')
    await see.visible(ctx.desktop.window('task-scheduler'))
    await ctx.app.close()
    ctx = await reconnectDesktop(userData, 'Teams toggle', true)
    await ctx.desktop.openApp('teams')
    await see.visible(ctx.desktop.window('teams').getByTestId('teams-app'))
    await ctx.desktop.window('teams').getByTestId('window-maximize').click()
    await shot(ctx.desktopPage, 'teams-enabled')
    await ctx.app.close()
    ctx = await reconnectDesktop(userData, 'Teams toggle')
    await see.count(ctx.desktop.windows('teams'), 0)
    await ctx.desktop.openStart()
    await see.gone(ctx.desktopPage.getByTestId('start-menu-item-teams'))
    await ctx.app.close()
    ctx = await reconnectDesktop(userData, 'Teams toggle', true)
    await see.visible(ctx.desktop.window('teams').getByTestId('teams-app'))
  } finally {
    await ctx.app.close()
    await rm(userData, { recursive: true, force: true })
  }
})
