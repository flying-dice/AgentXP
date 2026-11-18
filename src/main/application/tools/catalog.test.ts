import { describe, expect, it } from 'vitest'
import { DESKTOP_INSTRUCTIONS, TOOL_DEFS, WORK_QUIETLY_INSTRUCTIONS, desktopBriefing, desktopInstructions, desktopSystemPrompt, hostShellInstructions } from './catalog'

describe('desktopInstructions', () => {
  it('starts with how to work, then the shell, then the desktop', () => {
    const text = desktopInstructions('darwin')
    expect(text.startsWith(WORK_QUIETLY_INSTRUCTIONS)).toBe(true)
    expect(text.indexOf('macOS /bin/sh')).toBeLessThan(text.indexOf(DESKTOP_INSTRUCTIONS))
    expect(text.endsWith(DESKTOP_INSTRUCTIONS)).toBe(true)
  })

  it('tells the agent to work quietly: built-in and AgentXP tools are both fine and nothing opens', () => {
    expect(WORK_QUIETLY_INSTRUCTIONS).toContain('Work quietly')
    expect(WORK_QUIETLY_INSTRUCTIONS).toContain('Your own built-in tools and the AgentXP tools are both fine')
    expect(WORK_QUIETLY_INSTRUCTIONS).toContain('neither opens anything on the user\'s screen')
    expect(WORK_QUIETLY_INSTRUCTIONS).toContain('Output apps open behind the user\'s window')
    expect(WORK_QUIETLY_INSTRUCTIONS).toContain('never just so the user can watch you work')
    expect(WORK_QUIETLY_INSTRUCTIONS).toContain('Bash or shell sub-agent')
    expect(WORK_QUIETLY_INSTRUCTIONS).toContain('scheduler_*')
    // The old rule is gone: no tool is preferred "because the user watches", and tools no longer follow apps.
    expect(WORK_QUIETLY_INSTRUCTIONS).not.toContain('Prefer AgentXP tools')
    expect(DESKTOP_INSTRUCTIONS).not.toContain('Tools follow the apps that are open')
  })

  it('names the real shell of the host', () => {
    expect(hostShellInstructions('darwin')).toContain('macOS /bin/sh')
    expect(hostShellInstructions('darwin')).toContain('not dir or schtasks')
    expect(hostShellInstructions('linux')).toContain('Linux /bin/sh')
    expect(hostShellInstructions('win32')).toContain('Windows cmd.exe')
    expect(hostShellInstructions('win32')).not.toContain('schtasks')
  })

  it('gives the system prompt the whole text under a heading, and the briefing the work rules and the shell', () => {
    expect(desktopSystemPrompt('darwin')).toBe(`# Working on the AgentXP desktop\n\n${desktopInstructions('darwin')}`)
    const briefing = desktopBriefing('linux')
    expect(briefing.startsWith('## Working on the AgentXP desktop\n')).toBe(true)
    expect(briefing).toContain(WORK_QUIETLY_INSTRUCTIONS)
    expect(briefing).toContain('Linux /bin/sh')
    expect(briefing).not.toContain(DESKTOP_INSTRUCTIONS) // the long part stays in the system prompt and the MCP instructions
  })

  it('every tool the instructions point at exists', () => {
    const named = WORK_QUIETLY_INSTRUCTIONS.match(/\b(?:terminal|fs|code|browser|a2ui)_[a-z_]+/g) ?? []
    expect(named.length).toBeGreaterThan(0)
    for (const name of named) expect(Object.keys(TOOL_DEFS).concat(['a2ui_render'])).toContain(name)
  })
})

describe('tool descriptions', () => {
  it('never promise that a Work tool opens a window', () => {
    for (const tool of ['fs_list', 'fs_find', 'code_read', 'code_search', 'code_edit', 'code_write', 'terminal_run'] as const) {
      const text = TOOL_DEFS[tool].description
      expect(text, tool).toContain('Opens nothing')
      expect(text, tool).not.toMatch(/opens when needed|Needs the Explorer|Code shows|appears in/i)
    }
  })

  it('show: only when the user should look, one target, always a reason; the old code_* names say they are deprecated', () => {
    const show = TOOL_DEFS.show
    expect(show.group).toBe('show')
    expect(show.description).toContain('Use it only when you want the user to look')
    expect(show.description).toContain('The note is required')
    expect(show.description).toMatch(/shown now, queued, sent as a request, or not shown/)
    expect(show.input.safeParse({ target: { kind: 'file', path: 'a.ts', lines: [1, 2] }, note: 'Why' }).success).toBe(true)
    expect(show.input.safeParse({ target: { kind: 'file', path: 'a.ts' }, note: '  ' }).success).toBe(false)
    expect(show.input.safeParse({ target: { kind: 'file', path: 'a.ts' } }).success).toBe(false)
    expect(show.input.safeParse({ target: { kind: 'card', boardId: 'Sprint', cardId: 3 }, note: 'x' }).success).toBe(true)
    for (const alias of ['code_open', 'code_reveal', 'code_show_diff'] as const) {
      expect(TOOL_DEFS[alias].group).toBe('show')
      expect(TOOL_DEFS[alias].description).toMatch(/^Deprecated: use show/)
    }
    expect(WORK_QUIETLY_INSTRUCTIONS).toContain('call show: one target')
    expect(WORK_QUIETLY_INSTRUCTIONS).toContain('always a short note saying why')
  })

  it('has no tool that moves the focus', () => {
    expect(Object.keys(TOOL_DEFS)).not.toContain('desktop_focus_app')
  })
})
