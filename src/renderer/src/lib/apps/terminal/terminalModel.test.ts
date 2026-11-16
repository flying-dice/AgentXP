import { describe, expect, it } from 'vitest'
import { collectTerminals, lastLines, renderTerminal, stripAnsi, terminalLabel } from './terminalModel'

const sources = [
  { sessionId: 1, sessionTitle: 'Fix login', terminals: { t1: { command: 'npm test', output: 'ok\n', exitCode: 0 } } },
  { sessionId: 2, sessionTitle: 'Build', terminals: { t1: { command: 'npm run build', output: '...', exitCode: null } } }
]

describe('terminalModel', () => {
  it('collects terminals of several chats with unique keys', () => {
    const list = collectTerminals(sources)
    expect(list.map((t) => t.key)).toEqual(['1:t1', '2:t1'])
    expect(list.map((t) => t.running)).toEqual([false, true])
  })

  it('strips ANSI escapes', () => {
    expect(stripAnsi('\u001b[36mvite\u001b[0m v5')).toBe('vite v5')
  })

  it('keeps the last lines without trailing blanks', () => {
    const output = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join('\n') + '\n\n'
    const lines = lastLines(output, 20)
    expect(lines).toHaveLength(20)
    expect(lines[0]).toBe('line 11')
    expect(lines.at(-1)).toBe('line 30')
    expect(lastLines('')).toEqual([])
    expect(lastLines('\u001b[31mred\u001b[0m\r\nb')).toEqual(['red', 'b'])
  })

  it('renders a finished command with a fresh prompt', () => {
    const text = renderTerminal(collectTerminals(sources)[0])
    expect(text).toContain('C:\\Users\\Agent>npm test\nok')
    expect(text.endsWith('C:\\Users\\Agent>')).toBe(true)
    expect(renderTerminal(collectTerminals(sources)[0], 'E:\\src').endsWith('E:\\src>')).toBe(true)
  })

  it('renders a running command without a prompt and flags failures', () => {
    expect(renderTerminal(collectTerminals(sources)[1]).endsWith('...\n\n')).toBe(true)
    const failed = renderTerminal({ ...collectTerminals(sources)[0], exitCode: 2 })
    expect(failed).toContain('(exit code 2)')
    expect(renderTerminal(null)).toContain('C:\\Users\\Agent>')
  })

  it('labels entries', () => {
    const [done, running] = collectTerminals(sources)
    expect(terminalLabel(done, false)).toBe('npm test')
    expect(terminalLabel(running, true)).toBe('Build: npm run build (running)')
  })
})
