// J16, J17, J22: permissions, agents, help.
import { all, fail, manual, pass, withAnswer } from './util.mjs'

/** Text of a window that looks like Help and Support (any app window), or null. */
async function helpText(ctx) {
  for (const page of ctx.windows()) {
    const text = await page.evaluate(() => document.body.innerText).catch(() => '')
    if (/help and support/i.test(text)) return text
  }
  return null
}

export const checks = {
  async 'T16.1'(ctx) {
    const policy = await ctx.policy()
    return all([
      [policy.groups['fs.write'] === 'ask', `Write files = ${policy.groups['fs.write']}`],
      [policy.groups['fs.read'] === 'allow', `Read files = ${policy.groups['fs.read']}`]
    ])
  },

  async 'T16.2'(ctx, { answer }) {
    const base = pass('nothing to verify in the app state')
    return withAnswer(base, answer, { keywords: [['no', 'not', 'still']], expect: "no: turning off Code does not stop Notepad from writing files (both provide Write files). The answer must come from the screen or the manual (check the log: Control Centre or Help opened)" })
  },

  async 'T17.1'(ctx) {
    const agents = await ctx.agentsList()
    const mine = agents.find((a) => a.command === 'node' && a.args.some((x) => x.includes('my-agent.js')))
    return all([
      [Boolean(mine), 'an agent with command node and my-agent.js exists'],
      [mine?.isDefault === true, 'it is the default']
    ])
  },

  async 'T17.2'(ctx, { answer }) {
    return withAnswer(pass('the app is still the same process (not restarted)'), answer, { keywords: [['not-a-real-command', 'not found', 'command']], expect: 'the answer names the wrong command or "not found" and points to the Agents page; the panelist did not restart the app' })
  },

  async 'T22.1'(ctx, { answer }) {
    const text = await helpText(ctx)
    if (!text) return fail('Help and Support is not open (no window shows it)')
    return withAnswer(all([[/explorer/i.test(text), 'a help topic about Explorer is open']]), answer, { keywords: [['plug', 'project', 'folder', 'drive']], expect: 'the panelist states what Plug in a project does' })
  },

  async 'T22.2'(ctx, { answer }) {
    const text = await helpText(ctx)
    if (!text) return fail('Help and Support is not open (no window shows it)')
    return withAnswer(all([[/recycle bin|changes/i.test(text), 'the topic about the Changes pane or Recycle Bin is open']]), answer, { keywords: [['revert', 'undo'], ['changes', 'recycle']], expect: 'the answer lists the steps correctly (Tasks and changes > Changes > select > Revert; Recycle Bin to restore)' })
  }
}

void manual
