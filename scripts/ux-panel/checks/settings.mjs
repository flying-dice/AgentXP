// J16, J17, J22: permissions, agents, help.
import { all, fail, helpInfo, manual, pass, withAnswer } from './util.mjs'

export const checks = {
  async 'T16.1'(ctx) {
    const policy = await ctx.policy()
    return all([
      [policy.groups['fs.write'] === 'ask', `Write files = ${policy.groups['fs.write']}`],
      [policy.groups['fs.read'] === 'allow', `Read files = ${policy.groups['fs.read']}`]
    ])
  },

  async 'T16.2'(ctx, { answer }) {
    // Free text: always MANUAL (a keyword such as "no" would match almost any answer).
    void ctx
    return manual("nothing to verify in the app state; researcher must verify the panelist's answer" + (answer ? ` ("${answer}")` : '') + ': no, turning off Code does not stop Notepad from writing files (both provide Write files). The answer must come from the screen or the manual (check the log: Control Centre or Help opened)')
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
    const pid = ctx.app?.process?.()?.pid ?? null
    const same = ctx.state.appPid == null || pid === ctx.state.appPid
    const state = all([[same, `the app is still the same process (pid ${pid}, was ${ctx.state.appPid ?? 'not recorded'})`]])
    return withAnswer(state, answer, {
      keywords: [['not-a-real-command', 'not found'], ['agents page', 'agents', 'agent manager', 'settings']],
      expect: 'the answer names the wrong command ("not-a-real-command" or "not found") and points to the Agents page; the panelist did not restart the app'
    })
  },

  async 'T22.1'(ctx, { answer }) {
    const help = await helpInfo(ctx)
    if (!help) return fail('no Help window is open (neither "Help and Support" nor "Chat Help"; no window with app help)')
    return withAnswer(all([[help.topic === 'explorer' || /explorer/i.test(help.text), `a help topic about Explorer is open (topic ${help.topic ?? '?'})`]]), answer, { keywords: [['plug', 'project', 'folder', 'drive']], expect: 'the panelist states what Plug in a project does' })
  },

  async 'T22.2'(ctx, { answer }) {
    const help = await helpInfo(ctx)
    if (!help) return fail('no Help window is open (neither "Help and Support" nor "Chat Help"; no window with app help)')
    const ok = ['recycle-bin', 'chat'].includes(help.topic) || /recycle bin|changes/i.test(help.text)
    return withAnswer(all([[ok, `the topic about the Changes pane or Recycle Bin is open (topic ${help.topic ?? '?'})`]]), answer, { keywords: [['revert', 'undo'], ['changes', 'recycle']], expect: 'the answer lists the steps correctly (Tasks and changes > Changes > select > Revert; Recycle Bin to restore)' })
  }
}

void pass
