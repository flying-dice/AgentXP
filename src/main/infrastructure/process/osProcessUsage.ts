import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import type { ProcessUsage, ProcessUsagePort } from '../../application/ProcessService'

/** Parses `/proc/<pid>/stat`: the CPU time (user + system, in clock ticks). The name in parentheses may hold spaces. */
export function parseProcStat(stat: string): number | null {
  const rest = stat.slice(stat.lastIndexOf(')') + 2).split(' ')
  const utime = Number(rest[11])
  const stime = Number(rest[12])
  return Number.isFinite(utime) && Number.isFinite(stime) ? utime + stime : null
}

/** Parses `/proc/<pid>/status`: the resident memory in bytes. */
export function parseProcRss(status: string): number | null {
  const match = /^VmRSS:\s+(\d+)\s*kB/m.exec(status)
  return match ? Number(match[1]) * 1024 : null
}

/** Parses one line of `tasklist /FO CSV /NH /V`: memory in bytes and CPU time in seconds. */
export function parseTasklist(line: string): { memoryBytes: number; cpuSeconds: number } | null {
  const cells = [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1])
  if (cells.length < 8) return null
  const memory = Number(cells[4].replace(/[^\d]/g, ''))
  const [h, m, s] = cells[7].split(':').map(Number)
  if (!Number.isFinite(memory) || ![h, m, s].every(Number.isFinite)) return null
  return { memoryBytes: memory * 1024, cpuSeconds: h * 3600 + m * 60 + s }
}

const CLOCK_TICKS = 100

interface Sample {
  at: number
  cpuSeconds: number
}

/**
 * Memory and CPU of agent programs for Task Manager. Linux reads /proc; Windows asks `tasklist` in the background (the
 * answer of the last ask is what `sample` returns, so a call never waits). A process that cannot be read gives null.
 */
export class OsProcessUsage implements ProcessUsagePort {
  private readonly last = new Map<number, Sample>()
  private readonly latest = new Map<number, ProcessUsage>()

  constructor(private readonly platform: NodeJS.Platform = process.platform) {}

  sample(pid: number): ProcessUsage | null {
    if (this.platform === 'win32') this.askTasklist(pid)
    else if (this.platform === 'linux') this.readProc(pid)
    return this.latest.get(pid) ?? null
  }

  private record(pid: number, memoryBytes: number, cpuSeconds: number): void {
    const now = Date.now()
    const before = this.last.get(pid)
    const cpuPercent = before && now > before.at ? Math.max(0, ((cpuSeconds - before.cpuSeconds) / ((now - before.at) / 1000)) * 100) : (this.latest.get(pid)?.cpuPercent ?? 0)
    if (!before || now - before.at >= 1000) this.last.set(pid, { at: now, cpuSeconds })
    this.latest.set(pid, { memoryBytes, cpuPercent: Math.round(cpuPercent * 10) / 10 })
  }

  private readProc(pid: number): void {
    try {
      const ticks = parseProcStat(readFileSync(`/proc/${pid}/stat`, 'utf8'))
      const rss = parseProcRss(readFileSync(`/proc/${pid}/status`, 'utf8'))
      if (ticks !== null && rss !== null) this.record(pid, rss, ticks / CLOCK_TICKS)
    } catch {
      this.latest.delete(pid)
      this.last.delete(pid)
    }
  }

  private askTasklist(pid: number): void {
    execFile('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH', '/V'], { windowsHide: true, timeout: 5000 }, (error, stdout) => {
      const parsed = error ? null : parseTasklist(stdout.split(/\r?\n/).find((l) => l.startsWith('"')) ?? '')
      if (parsed) this.record(pid, parsed.memoryBytes, parsed.cpuSeconds)
      else {
        this.latest.delete(pid)
        this.last.delete(pid)
      }
    })
  }
}
