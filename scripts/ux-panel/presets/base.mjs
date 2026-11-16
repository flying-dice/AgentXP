import { TEST_PAGE_URL } from '../lib/fixtures.mjs'

export const ALL_ALLOW = { 'fs.read': 'allow', 'fs.write': 'allow', notepad: 'allow', code: 'allow', terminal: 'allow', browser: 'allow', paint: 'allow', wordpad: 'allow', notes: 'allow', events: 'allow', snip: 'allow', recycle: 'allow' }
export const PROMPT_FIX = 'Fix the login redirect bug so that deep links survive sign-in'

/** Resolves project keys (`loginApp`, `docsSite`, `plain`) to folder paths. */
export const projectPaths = (ctx, keys) => keys.map((k) => (k === 'loginAppGit' ? ctx.fixtures.loginAppGit() : ctx.fixtures[k]))

/**
 * A scripted agent as the default agent, plus a desktop with projects plugged in and (optionally) connected.
 * Records ids in ctx.state for the checks.
 */
export async function projectDesktop(ctx, { title = 'Workspace', script = 'demo', stepMode, projects = ['loginApp'], connect = true, policy, allowAll, open = [], browserUrl, git, modifyGit } = {}) {
  const keys = git ? projects.map((k) => (k === 'loginApp' ? 'loginAppGit' : k)) : projects
  const paths = projectPaths(ctx, keys)
  if (modifyGit) await modifyGitProject(ctx, paths[0])
  const agent = script ? await ctx.useScript(script, { stepMode }) : null
  if (allowAll) await ctx.setPolicy(ALL_ALLOW)
  if (policy) await ctx.setPolicy(policy)
  const desktop = await ctx.createDesktop({ title, projects: paths, connect, agentId: agent?.id })
  Object.assign(ctx.state, { desktopId: desktop.id, desktopTitle: title, agentId: agent?.id ?? null, projectPaths: paths })
  for (const app of open) await ctx.openApp(desktop.id, app, app === 'browser' ? { url: browserUrl ?? TEST_PAGE_URL } : {})
  ctx.saveState()
  return { desktop, agent, paths }
}

export async function modifyGitProject(ctx, root) {
  const { writeFileSync } = await import('node:fs')
  const { join } = await import('node:path')
  const { REDIRECT_FIXED, LOGIN_EDITED } = await import('../lib/fixtures.mjs')
  writeFileSync(join(root, 'src/auth/redirect.ts'), REDIRECT_FIXED)
  writeFileSync(join(root, 'src/auth/login.ts'), LOGIN_EDITED)
  writeFileSync(join(root, 'src/auth/session.ts'), 'export const sessionMinutes = 30\n')
}

/** A chat on the first project drive, a prompt typed through the chat window, and a wait for the first pending request. */
export async function chatWithPendingRequest(ctx, desktopId, prompt) {
  const chat = await ctx.newChat(desktopId)
  await ctx.sendPrompt(desktopId, chat.sessionId, prompt)
  await ctx.waitPending(chat.sessionId)
  return chat
}

/** Control client of the only scripted agent of the run (starts with the first turn). */
export async function controlOf(agent) {
  return agent.control()
}
