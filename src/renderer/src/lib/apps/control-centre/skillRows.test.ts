import { describe, expect, it } from 'vitest'
import type { McpServerDto } from '@shared/teams'
import { folderNameOf, mcpRows, skillRows, toolsSummary } from './skillRows'
import { emptyMcpForm, inputFromForm, validateMcpForm } from './mcpForm'

const server = (over: Partial<McpServerDto> = {}): McpServerDto => ({ id: 1, name: 'github', transport: 'stdio', command: 'npx', args: ['-y', 'x'], url: '', vars: [], enabled: true, tools: [], lastTest: null, ...over })

describe('skill and MCP rows', () => {
  it('lists skills with their state', () => {
    const rows = skillRows([{ id: 2, name: 'pdf', description: 'PDFs', path: 'C:\\s\\pdf', enabled: false, installedAt: '' }])
    expect(rows).toEqual([{ id: '2', icon: 'library', name: 'pdf', description: 'PDFs', status: 'Off' }])
  })

  it('summarises the tools of a server', () => {
    expect(toolsSummary(server())).toBe('Not tested yet')
    expect(toolsSummary(server({ lastTest: { ok: true, message: '', at: '' } }))).toBe('None')
    const tools = [{ name: 'a', description: '', enabled: true }, { name: 'b', description: '', enabled: false }]
    expect(toolsSummary(server({ tools }))).toBe('1 of 2 on')
    expect(toolsSummary(server({ tools: [tools[0]] }))).toBe('1 on')
  })

  it('shows what starts a server', () => {
    expect(mcpRows([server()])[0]).toMatchObject({ type: 'Program', target: 'npx -y x', status: 'On' })
    expect(mcpRows([server({ transport: 'http', url: 'https://x.test/mcp' })])[0]).toMatchObject({ type: 'Web address', target: 'https://x.test/mcp' })
  })

  it('names a skill folder', () => {
    expect(folderNameOf('C:\\skills\\pdf\\')).toBe('pdf')
    expect(folderNameOf('/home/me/skills/review')).toBe('review')
  })
})

describe('MCP server form', () => {
  it('asks for the missing parts', () => {
    const form = emptyMcpForm()
    expect(validateMcpForm(form)).toMatch(/name/)
    form.name = 'bad name'
    expect(validateMcpForm(form)).toMatch(/letters/)
    form.name = 'ok'
    expect(validateMcpForm(form)).toMatch(/program/)
    form.command = 'node'
    expect(validateMcpForm(form)).toBeNull()
    form.transport = 'http'
    expect(validateMcpForm(form)).toMatch(/address/)
    form.url = 'https://x.test'
    expect(validateMcpForm(form)).toBeNull()
  })

  it('turns the form into an input without empty variables', () => {
    const form = { ...emptyMcpForm(), name: ' x ', command: ' node ', args: 'a.js\n\nb', vars: [{ key: ' K ', value: 'v', secret: true }, { key: '', value: 'z', secret: false }] }
    expect(inputFromForm(form)).toEqual({ name: 'x', transport: 'stdio', command: 'node', args: ['a.js', 'b'], url: '', vars: [{ key: 'K', value: 'v', secret: true }] })
  })
})
