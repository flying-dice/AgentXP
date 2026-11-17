import { describe, expect, it } from 'vitest'
import { agentIdentity, UNNAMED_AGENT } from './identity'
import { colorOfName } from './teams'

describe('agentIdentity', () => {
  it('a team member is its profile: name and colour', () => {
    expect(agentIdentity({ sessionId: 7, member: { name: 'Builder', color: '#123456' }, agentName: 'Claude' })).toEqual({ name: 'Builder', color: '#123456' })
  })

  it('a member without a colour gets the colour of its name', () => {
    expect(agentIdentity({ sessionId: 7, member: { name: 'Builder', color: '' } })).toEqual({ name: 'Builder', color: colorOfName('Builder') })
  })

  it('a plain chat is the agent display name with the colour of its session id', () => {
    expect(agentIdentity({ sessionId: 7, agentName: 'Scripted Agent' })).toEqual({ name: 'Scripted Agent', color: colorOfName('7') })
  })

  it('two chats of the same agent keep one name and may differ in colour, each stable', () => {
    const a = agentIdentity({ sessionId: 1, agentName: 'Claude' })
    expect(agentIdentity({ sessionId: 1, agentName: 'Claude' })).toEqual(a)
    expect(agentIdentity({ sessionId: 2, agentName: 'Claude' }).name).toBe('Claude')
  })

  it('an agent without a name is called Agent', () => {
    expect(agentIdentity({ sessionId: 3, agentName: '  ' }).name).toBe(UNNAMED_AGENT)
    expect(agentIdentity({ sessionId: 3 }).name).toBe(UNNAMED_AGENT)
  })
})
