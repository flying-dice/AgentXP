import { describe, expect, it } from 'vitest'
import { deriveAgentStatus, statusLabelFor } from './agentStatus'

describe('deriveAgentStatus', () => {
  const call = (kind: 'read' | 'edit', path: string, status: 'completed' | 'in_progress' | 'failed' = 'completed') => ({
    kind,
    status,
    locations: [{ path, line: null }]
  })

  it('maps changes and tool calls by VPath', () => {
    const map = deriveAgentStatus({
      changes: [
        { path: 'E:\\src\\auth\\urls.ts', kind: 'added' },
        { path: 'E:\\src\\auth\\redirect.ts', kind: 'modified' },
        { path: 'C:\\Users\\Agent\\Documents\\old.txt', kind: 'deleted' }
      ],
      toolCalls: [call('read', 'E:\\src\\auth\\redirect.ts'), call('read', 'e:/package.json'), call('edit', 'E:\\src\\index.ts', 'in_progress'), call('read', 'E:\\x.ts', 'failed')]
    })
    expect(map.get('E:\\src\\auth\\urls.ts')).toBe('created')
    expect(map.get('E:\\src\\auth\\redirect.ts')).toBe('changed')
    expect(map.get('C:\\Users\\Agent\\Documents\\old.txt')).toBe('deleted')
    expect(map.get('E:\\package.json')).toBe('read')
    expect(map.get('E:\\src\\index.ts')).toBe('editing')
    expect(map.has('E:\\x.ts')).toBe(false)
  })

  it('ignores relative paths', () => {
    expect(deriveAgentStatus({ changes: [{ path: 'src/a.ts', kind: 'added' }], toolCalls: [] }).size).toBe(0)
  })

  it('labels files and folders', () => {
    const map = deriveAgentStatus({
      changes: [{ path: 'E:\\src\\auth\\urls.ts', kind: 'added' }],
      toolCalls: [call('read', 'E:\\README.md')]
    })
    expect(statusLabelFor(map, 'E:\\src\\auth\\urls.ts', false)).toBe('Created this desktop')
    expect(statusLabelFor(map, 'E:\\README.md', false)).toBe('Read')
    expect(statusLabelFor(map, 'E:\\src', true)).toBe('Contains changes')
    expect(statusLabelFor(map, 'E:\\', true)).toBe('Contains changes')
    expect(statusLabelFor(map, 'E:\\tests', true)).toBe('')
    expect(statusLabelFor(map, 'E:\\package.json', false)).toBe('')
  })
})
