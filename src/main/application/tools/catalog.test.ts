import { describe, expect, it } from 'vitest'
import { DESKTOP_INSTRUCTIONS, PREFER_DESKTOP_INSTRUCTIONS, TOOL_DEFS, desktopBriefing, desktopInstructions, desktopSystemPrompt, hostShellInstructions } from './catalog'

describe('desktopInstructions', () => {
  it('starts with which tools to prefer, then the shell, then the desktop', () => {
    const text = desktopInstructions('darwin')
    expect(text.startsWith(PREFER_DESKTOP_INSTRUCTIONS)).toBe(true)
    expect(text.indexOf('macOS /bin/sh')).toBeLessThan(text.indexOf(DESKTOP_INSTRUCTIONS))
    expect(text.endsWith(DESKTOP_INSTRUCTIONS)).toBe(true)
  })

  it('steers built-in tools to the desktop apps without forbidding them', () => {
    for (const steer of ['terminal_run', 'fs_find', 'code_search', 'code_read', 'code_edit', 'code_write', 'code_open', 'browser_navigate', 'scheduler_*', 'Bash or shell sub-agent']) {
      expect(PREFER_DESKTOP_INSTRUCTIONS).toContain(steer)
    }
    expect(PREFER_DESKTOP_INSTRUCTIONS).toContain('Use a built-in tool only when no AgentXP tool can do the job')
  })

  it('names the real shell of the host', () => {
    expect(hostShellInstructions('darwin')).toContain('macOS /bin/sh')
    expect(hostShellInstructions('darwin')).toContain('not dir or schtasks')
    expect(hostShellInstructions('linux')).toContain('Linux /bin/sh')
    expect(hostShellInstructions('win32')).toContain('Windows cmd.exe')
    expect(hostShellInstructions('win32')).not.toContain('schtasks')
  })

  it('gives the system prompt the whole text under a heading, and the briefing the tool preference and the shell', () => {
    expect(desktopSystemPrompt('darwin')).toBe(`# Working on the AgentXP desktop\n\n${desktopInstructions('darwin')}`)
    const briefing = desktopBriefing('linux')
    expect(briefing.startsWith('## Working on the AgentXP desktop\n')).toBe(true)
    expect(briefing).toContain(PREFER_DESKTOP_INSTRUCTIONS)
    expect(briefing).toContain('Linux /bin/sh')
    expect(briefing).not.toContain(DESKTOP_INSTRUCTIONS) // the long part stays in the system prompt and the MCP instructions
  })

  it('every tool the instructions point at exists', () => {
    const named = PREFER_DESKTOP_INSTRUCTIONS.match(/\b(?:terminal|fs|code|browser)_[a-z_]+/g) ?? []
    expect(named.length).toBeGreaterThan(0)
    for (const name of named) expect(Object.keys(TOOL_DEFS)).toContain(name)
  })
})
