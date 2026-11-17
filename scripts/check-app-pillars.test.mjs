import { describe, expect, it } from 'vitest'
import { renderTable } from './check-app-pillars.mjs'

describe('renderTable', () => {
  it('marks met, gap and exempt pillars and lists the reasons of the ones that are not met', () => {
    const table = renderTable([
      { kind: 'chat', cells: { ui: 'yes', backend: 'yes', agentApi: 'exempt', e2e: 'yes', docs: 'yes' }, reasons: { agentApi: 'It is the agent.' } },
      { kind: 'kanban', cells: { ui: 'yes', backend: 'yes', agentApi: 'yes', e2e: 'gap', docs: 'yes' }, reasons: { e2e: 'No spec.' } }
    ])
    expect(table).toContain('| chat | Yes | Yes | n/a | Yes | Yes |')
    expect(table).toContain('| kanban | Yes | Yes | Yes | **Gap** | Yes |')
    expect(table).toContain('1 open gap(s).')
    expect(table).toContain('- **kanban, E2E** (gap): No spec.')
    expect(table).toContain('- **chat, Agent API** (not needed): It is the agent.')
  })
})
