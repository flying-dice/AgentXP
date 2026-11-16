// J08-J09: review and restore changes.
import { LOGIN_EDITED, REDIRECT_BUG, REDIRECT_FIXED } from '../lib/fixtures.mjs'
import { all, fail, manual, projectRoot, readText, withAnswer } from './util.mjs'

export const checks = {
  async 'T08.1'(ctx) {
    const root = projectRoot(ctx)
    const recycled = await ctx.recycled(ctx.state.desktopId)
    return all([
      [readText(root, 'src/auth/redirect.ts') === REDIRECT_BUG, 'redirect.ts on disk equals the original'],
      [readText(root, 'src/auth/login.ts') === LOGIN_EDITED, 'login.ts keeps the agent edit'],
      [recycled.length === 1 && recycled[0].path.endsWith('redirect.ts'), `one recycled change for redirect.ts (found ${recycled.map((r) => r.path).join(', ') || 'none'})`]
    ])
  },

  async 'T08.2'(ctx, { answer }) {
    const changes = await ctx.changes(ctx.state.sessionId)
    const ranked = [...changes].sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))
    const top = ranked[0]?.path.split('\\').pop() ?? '?'
    const state = changes.length >= 5 ? { status: 'PASS', reason: `${changes.length} agent changes exist`, notes: [] } : fail(`only ${changes.length} changes in the start state`)
    return withAnswer(state, answer, { keywords: [[String(changes.length), 'five'], top], expect: `${changes.length} files changed, most changed: ${top}; and the session log shows Code or the Changes pane was used [planned task]` })
  },

  async 'T09.1'(ctx) {
    const recycled = await ctx.recycled(ctx.state.desktopId)
    return all([
      [readText(projectRoot(ctx), 'src/auth/redirect.ts') === REDIRECT_FIXED, 'redirect.ts on disk equals the agent version'],
      [recycled.length === 0, `the Recycle Bin has ${recycled.length} item(s)`]
    ])
  }
}

void manual
