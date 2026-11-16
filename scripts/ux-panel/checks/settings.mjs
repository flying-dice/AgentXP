// J16, J17, J22: permissions, agents, help.
import { all, fail, helpInfo, manual, pass, withAnswer } from './util.mjs'

/** H-24: the tooltip of Plug in a project says "Plug in a project folder as a drive so that the agent can see its files." */
export const TOOLTIP_MEANING = /project folder|\bdrive\b|see (its|the|your) files|folder as a drive/i
const TOOLTIP_MEANING_TEXT = '"project folder", "drive" or "see its files"'

/** H-68: T16.2 answer words. */
export const T162_NO = /\b(no|not|nope|doesn'?t|does not|won'?t|will not)\b/i
export const T162_WHY = /write files|separate|both|notepad|each app|other app/i

export const checks = {
  async 'T16.1'(ctx) {
    const policy = await ctx.policy()
    return all([
      [policy.groups['fs.write'] === 'ask', `Write files = ${policy.groups['fs.write']}`],
      [policy.groups['fs.read'] === 'allow', `Read files = ${policy.groups['fs.read']}`]
    ])
  },

  async 'T16.2'(ctx, { answer }) {
    // H-68: the right answer is "no" (turning off Code does not stop Notepad: both provide Write files). The answer must say no
    // and name the reason (Write files, separate or both providers). The state is not part of the verdict.
    void ctx
    if (!answer) return manual('no answer given; the right answer is no: turning off Code does not stop Notepad from writing files (both provide Write files). Check the log: Control Center or Help opened')
    return T162_NO.test(answer) && T162_WHY.test(answer)
      ? pass('the answer says no and gives the reason (Write files / separate)')
      : fail('the answer must say no and why: Notepad also provides Write files (words: no/not/does not stop, and Write files, separate, both or Notepad)')
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
      // H-42: the cause, the place (Agents page) and what to do (edit/change it, choose another agent, set a default, new chat).
      keywords: [['not-a-real-command', 'not found'], ['agents page', 'agents', 'agent manager', 'settings'], ['edit', 'change', 'choose another', 'set as default', 'new chat']],
      expect: 'the answer names the wrong command ("not-a-real-command" or "not found"), points to the Agents page and says what to do (edit or change it, choose another agent, set a default); the panelist did not restart the app'
    })
  },

  async 'T22.1'(ctx, { answer }) {
    const help = await helpInfo(ctx)
    if (!help) {
      // H-24: the scenario says "find out"; the button's tooltip (UX-11) answers it, so a correct answer is enough without a Help window.
      if (!answer) return manual('no Help window is open and no answer was given; a tooltip answer must contain the meaning: ' + TOOLTIP_MEANING_TEXT)
      return TOOLTIP_MEANING.test(answer) ? pass('no Help window, but the answer gives the tooltip meaning of Plug in a project') : fail(`no Help window and the answer does not say what the button does (${TOOLTIP_MEANING_TEXT})`)
    }
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
