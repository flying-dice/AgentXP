import { describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_POLICY } from '@shared/desktop'
import { permissionInterrupt, permissionTurn } from '../app/session/session.fixtures'
import { approvalFromInterrupt, approvalGroup, approvalLabel, approvalOrigin, approvalPath, approvalQuestion, approvalReason, nextApproval, optionDescription, waitingLinkText, waitingOfText, waitingPosition } from './approval'

describe('approvals', () => {
  it('builds a pending approval with its tool call', () => {
    const { interrupt, state } = permissionTurn()
    const a = approvalFromInterrupt(3, interrupt, state)
    expect(a).toMatchObject({ key: '3:7', sessionId: 3, title: 'Edit src/auth/redirect.ts', toolKind: 'edit' })
    expect(a?.toolCall?.kind).toBe('edit')
    expect(a?.options.length).toBeGreaterThan(1)
  })
  it('ignores interrupts that are not permission requests', () => {
    expect(approvalFromInterrupt(1, null, null)).toBeNull()
    expect(approvalFromInterrupt(1, { id: 'x', reason: 'other', metadata: {} }, null)).toBeNull()
    expect(approvalFromInterrupt(1, permissionInterrupt('t', 'Run x', 'execute'), null)?.chatTitle).toBe('New chat')
  })
  it('words the question without tool names', () => {
    const { interrupt, state } = permissionTurn()
    const edit = approvalFromInterrupt(3, interrupt, state)!
    expect(approvalQuestion(edit)).toBe('Allow the agent to change src/auth/redirect.ts?')
    expect(approvalLabel(edit)).toBe('Change src/auth/redirect.ts')
    expect(approvalPath(edit)).toBe('E:\\src\\auth\\redirect.ts')
    const run = approvalFromInterrupt(1, permissionInterrupt('t', 'Run npm test', 'execute'), null)!
    expect(approvalQuestion(run)).toBe('Allow the agent to run a command?')
    expect(approvalPath(run)).toBeNull()
  })
  it('describes where a request came from', () => {
    expect(approvalOrigin('Fix the login redirect bug and add a test', '2026-11-16T10:42:00')).toBe("In chat 'Fix the login redirect bug a...' (started 10:42)")
    expect(approvalOrigin('hello')).toBe("In chat 'hello'")
    expect(approvalOrigin('hello', 'nope')).toBe("In chat 'hello'")
  })
  it('says what each choice does', () => {
    expect(optionDescription('allow_once')).toMatch(/goes ahead/)
    expect(optionDescription('reject_once')).toMatch(/Nothing changes/)
    expect(optionDescription('allow_always')).toMatch(/does not ask again/)
    expect(optionDescription('reject_always')).toMatch(/cannot/)
  })
  it('maps tool kinds to groups', () => {
    expect(approvalGroup('edit')).toBe('fs.write')
    expect(approvalGroup('execute')).toBe('terminal')
    expect(approvalGroup('think')).toBeNull()
    expect(approvalGroup(null)).toBeNull()
  })
  it('explains the reason from the policy when derivable', () => {
    expect(approvalReason('edit', DEFAULT_TOOL_POLICY, false)).toBe('Write files is set to Ask in Control Center.')
    expect(approvalReason('execute', DEFAULT_TOOL_POLICY, false)).toBe('Run commands is set to Ask in Control Center.')
    expect(approvalReason('read', DEFAULT_TOOL_POLICY, false)).toBe('The agent asked for your permission.')
    expect(approvalReason('edit', null, false)).toBe('The agent asked for your permission.')
    expect(approvalReason(null, null, false)).toBe('The agent asked for your permission.')
    expect(approvalReason('edit', DEFAULT_TOOL_POLICY, true)).toMatch(/Ask before every action/)
  })
})

describe('the queue of waiting requests (UX-138)', () => {
  const run = (session: number, chat: string) => ({ ...approvalFromInterrupt(session, permissionInterrupt('t', 'Run npm test', 'execute'), null)!, chatTitle: chat })
  // `pending` lists the newest chat first: chat 2 asked after chat 1.
  const pending = [run(2, 'Dotfiles'), run(1, 'Fix login redirect')]

  it('opens the oldest request and names its chat in the link', () => {
    expect(nextApproval(pending)?.sessionId).toBe(1)
    expect(waitingLinkText([run(1, 'Fix login redirect')])).toBe('Fix login redirect is waiting: run a command')
    expect(waitingLinkText(pending)).toBe('Fix login redirect is waiting: run a command (1 of 2 waiting)')
    expect(waitingLinkText([])).toBeNull()
  })
  it('says where the request of a chat stands, only when more than one waits', () => {
    expect(waitingPosition(pending, 1)).toEqual({ position: 1, total: 2 })
    expect(waitingPosition(pending, 2)).toEqual({ position: 2, total: 2 })
    expect(waitingPosition(pending, 3)).toBeNull()
    expect(waitingPosition([pending[0]], 2)).toBeNull()
    expect(waitingOfText({ position: 1, total: 2 })).toBe('1 of 2 waiting')
  })
  it('shortens a long chat name', () => {
    expect(waitingLinkText([run(1, 'Fix the login redirect bug and add a test')])).toBe('Fix the login redirect bug a... is waiting: run a command')
  })
})
