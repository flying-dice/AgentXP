import { describe, expect, it } from 'vitest'
import type { RoomMemberDto } from '@shared/teams'
import { dateOf, initialOf, insertMention, lastReceivedLine, mentionOf, nearBottom, workingLine } from './roomModel'

const member = (name: string, activity: RoomMemberDto['activity'] = 'idle', queued = 0): RoomMemberDto => ({ profileId: 1, name, color: '#000', sessionId: null, activity, queued })

describe('room model', () => {
  it('makes avatars and mentions', () => {
    expect(initialOf(' coder')).toBe('C')
    expect(initialOf('')).toBe('?')
    expect(mentionOf('Code Reviewer')).toBe('@CodeReviewer')
  })

  it('adds a mention once', () => {
    expect(insertMention('', 'Coder')).toBe('@Coder ')
    expect(insertMention('hi', 'Coder')).toBe('hi @Coder ')
    expect(insertMention('hi @coder please', 'Coder')).toBe('hi @coder please')
  })

  it('says who is working', () => {
    expect(workingLine([member('Coder'), member('Reviewer')])).toBe('')
    expect(workingLine([member('Coder', 'thinking')])).toBe('Coder is thinking…')
    expect(workingLine([member('Coder', 'thinking', 2)])).toBe('Coder is thinking… (2 waiting)')
    expect(workingLine([member('Coder', 'thinking'), member('Planner', 'waiting'), member('Reviewer', 'starting')])).toBe('Coder, Planner and Reviewer are working')
    expect(workingLine([member('Coder', 'error')])).toBe('')
  })

  it('knows when the list is at the bottom', () => {
    expect(nearBottom({ scrollTop: 460, clientHeight: 100, scrollHeight: 600 })).toBe(true)
    expect(nearBottom({ scrollTop: 100, clientHeight: 100, scrollHeight: 600 })).toBe(false)
  })

  it('says when the last message of a member came in, as Messenger did', () => {
    const at = new Date(2015, 8, 14, 0, 13).toISOString()
    expect(dateOf(at)).toBe('14.9.2015')
    expect(lastReceivedLine([])).toBe('')
    expect(lastReceivedLine([{ profileId: null, createdAt: at }])).toBe('')
    expect(lastReceivedLine([{ profileId: 2, createdAt: at }, { profileId: null, createdAt: new Date().toISOString() }])).toBe('Last message received on 14.9.2015 at 00:13.')
  })
})
