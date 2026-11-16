import { describe, expect, it } from 'vitest'
import type { SessionDto } from '@shared/models'
import { sampleAgents, sampleSessions } from '../../app/fakeApi'
import { chatRows, contextState, formatTokens, processRows } from './processRows'

describe('processRows', () => {
  it('describes processes', () => {
    const rows = processRows(
      [
        { agentId: 1, agentName: 'Claude Code', desktopId: 1, pid: 4312, sessionIds: [1, 2, 3] },
        { agentId: 2, agentName: 'Gemini CLI', desktopId: 2, pid: null, sessionIds: [] }
      ],
      1
    )
    expect(rows[0]).toMatchObject({ id: '1:1', pid: '4312', desktop: 'This desktop', chats: 3 })
    expect(rows[1]).toMatchObject({ pid: '-', desktop: 'Desktop 2', chats: 0 })
  })

  it('describes chats with their context use', () => {
    const busy: SessionDto = { ...sampleSessions[0], status: 'working', contextUsed: 150000, contextSize: 200000 }
    const [row] = chatRows([busy], sampleAgents)
    expect(row).toMatchObject({ agent: 'Claude Code', status: 'Working', context: '75%', percent: 75 })
    expect(chatRows([{ ...busy, contextSize: 0 }], [])[0]).toMatchObject({ context: '-', agent: 'Agent 1' })
  })

  it('picks the bar state and formats tokens', () => {
    expect([10, 70, 95].map(contextState)).toEqual(['normal', 'paused', 'error'])
    expect([950, 1500, 12000].map(formatTokens)).toEqual(['950', '1.5k', '12k'])
  })
})
