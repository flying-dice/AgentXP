import { describe, expect, it } from 'vitest'
import { OsProcessUsage, parseProcRss, parseProcStat, parseTasklist } from './osProcessUsage'

describe('process usage parsers', () => {
  it('reads CPU ticks from /proc stat even when the program name has spaces', () => {
    const stat = '4312 (my agent (x)) S 1 4312 4312 0 -1 4194560 100 0 0 0 150 50 0 0 20 0 1 0 12345 1000 200 18446744073709551615'
    expect(parseProcStat(stat)).toBe(200)
  })
  it('reads the resident memory', () => {
    expect(parseProcRss('Name:\tnode\nVmRSS:\t   2048 kB\n')).toBe(2048 * 1024)
    expect(parseProcRss('Name:\tnode\n')).toBeNull()
  })
  it('reads one tasklist line', () => {
    const line = '"node.exe","4312","Console","1","45,120 K","Running","PC\\user","0:01:05","N/A"'
    expect(parseTasklist(line)).toEqual({ memoryBytes: 45120 * 1024, cpuSeconds: 65 })
    expect(parseTasklist('INFO: No tasks are running')).toBeNull()
  })
})

describe('OsProcessUsage', () => {
  it('reads this very process on Linux', () => {
    if (process.platform !== 'linux') return
    const usage = new OsProcessUsage()
    const first = usage.sample(process.pid)
    expect(first?.memoryBytes).toBeGreaterThan(1024 * 1024)
  })
  it('gives null for a process that does not exist', () => {
    expect(new OsProcessUsage('linux').sample(2 ** 22 - 1)).toBeNull()
  })
})
