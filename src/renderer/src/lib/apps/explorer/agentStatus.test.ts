import { describe, expect, it } from 'vitest'
import { deriveAgentStatus, relativeToFolder, statusLabelFor } from './agentStatus'

const folder = 'C:\\Users\\jonathan\\source\\claude-code-win'

describe('relativeToFolder', () => {
  it('strips the folder prefix of Windows and POSIX paths', () => {
    expect(relativeToFolder(folder, `${folder}\\src\\auth\\a.ts`)).toBe('src/auth/a.ts')
    expect(relativeToFolder(folder.toLowerCase(), `${folder}\\src\\a.ts`)).toBe('src/a.ts')
    expect(relativeToFolder('/home/me/app', '/home/me/app/src/a.ts')).toBe('src/a.ts')
  })

  it('keeps relative paths and rejects foreign ones', () => {
    expect(relativeToFolder(folder, 'src\\a.ts')).toBe('src/a.ts')
    expect(relativeToFolder(folder, 'C:\\Windows\\a.ts')).toBeNull()
    expect(relativeToFolder('/home/me/app', '/home/me/application/a.ts')).toBeNull()
  })
})

describe('deriveAgentStatus', () => {
  const call = (kind: 'read' | 'edit', path: string, status: 'completed' | 'in_progress' | 'failed' = 'completed') => ({
    kind,
    status,
    locations: [{ path: `${folder}\\${path}`, line: null }]
  })

  it('maps changes and tool calls', () => {
    const map = deriveAgentStatus({
      folderPath: folder,
      changes: [
        { path: 'src/auth/urls.ts', kind: 'added' },
        { path: 'src/auth/redirect.ts', kind: 'modified' },
        { path: 'old.ts', kind: 'deleted' }
      ],
      toolCalls: [call('read', 'src\\auth\\redirect.ts'), call('read', 'package.json'), call('edit', 'src\\index.ts', 'in_progress'), call('read', 'x.ts', 'failed')]
    })
    expect(map.get('src/auth/urls.ts')).toBe('created')
    expect(map.get('src/auth/redirect.ts')).toBe('changed')
    expect(map.get('old.ts')).toBe('deleted')
    expect(map.get('package.json')).toBe('read')
    expect(map.get('src/index.ts')).toBe('editing')
    expect(map.has('x.ts')).toBe(false)
  })

  it('labels files and folders', () => {
    const map = deriveAgentStatus({
      folderPath: folder,
      changes: [{ path: 'src/auth/urls.ts', kind: 'added' }],
      toolCalls: [call('read', 'README.md')]
    })
    expect(statusLabelFor(map, 'src/auth/urls.ts', false)).toBe('Created this desktop')
    expect(statusLabelFor(map, 'README.md', false)).toBe('Read')
    expect(statusLabelFor(map, 'src', true)).toBe('Contains changes')
    expect(statusLabelFor(map, 'tests', true)).toBe('')
    expect(statusLabelFor(map, 'package.json', false)).toBe('')
  })
})
