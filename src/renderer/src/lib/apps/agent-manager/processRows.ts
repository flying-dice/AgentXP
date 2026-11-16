/** Pure row builders of the Agent Manager. */
import type { AgentProcessDto } from '@shared/desktop'
import type { AgentDto, SessionDto, TerminalDto } from '@shared/models'
import { contextPercent, isBusy, statusLabel } from '../../app/sessionStatus'

export type ProcessRow = {
  id: string
  agentId: number
  desktopId: number
  agent: string
  pid: string
  desktop: string
  chats: number
  memory: string
  cpu: string
}

/** `45.1 MB`; `-` when Task Manager cannot read it. */
export function formatMemory(bytes: number | null): string {
  if (bytes === null) return '-'
  const mb = bytes / (1024 * 1024)
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`
}

export const formatCpu = (percent: number | null): string => (percent === null ? '-' : `${percent.toFixed(1)}%`)

export function processRows(processes: readonly AgentProcessDto[], currentDesktopId: number): ProcessRow[] {
  return processes.map((p) => ({
    id: `${p.agentId}:${p.desktopId}`,
    agentId: p.agentId,
    desktopId: p.desktopId,
    agent: p.agentName,
    pid: p.pid === null ? '-' : String(p.pid),
    desktop: p.desktopId === currentDesktopId ? 'This desktop' : `Desktop ${p.desktopId}`,
    chats: p.sessionIds.length,
    memory: formatMemory(p.memoryBytes ?? null),
    cpu: formatCpu(p.cpuPercent ?? null)
  }))
}

export interface ChatRow {
  id: string
  title: string
  agent: string
  status: string
  context: string
  /** `12.3k / 200k` tokens of context. */
  tokens: string
  percent: number
  busy: boolean
}

/** A chat that is idle has its agent program running: the table says so, because "Idle" next to a process reads like "off". */
export const chatStatusText = (status: SessionDto['status']): string => (status === 'idle' ? 'Idle (the agent program is still running)' : statusLabel(status))

export function chatRows(sessions: readonly SessionDto[], agents: readonly AgentDto[]): ChatRow[] {
  return sessions.map((s) => {
    const percent = contextPercent(s.contextUsed, s.contextSize)
    return {
      id: String(s.id),
      title: s.title || 'New chat',
      agent: agents.find((a) => a.id === s.agentId)?.name ?? `Removed agent (${s.agentId})`,
      status: chatStatusText(s.status),
      context: s.contextSize > 0 ? `${percent}%` : '-',
      tokens: s.contextSize > 0 ? `${formatTokens(s.contextUsed)} / ${formatTokens(s.contextSize)}` : '-',
      percent,
      busy: isBusy(s.status)
    }
  })
}

/** Progress bar state for a context percentage: green, yellow from 70 %, red from 90 %. */
export const contextState = (percent: number): 'normal' | 'paused' | 'error' => (percent >= 90 ? 'error' : percent >= 70 ? 'paused' : 'normal')

export const formatTokens = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n))

export interface TerminalRow {
  id: string
  chat: string
  command: string
  cwd: string
  status: string
}

/** ACP terminals of the chats, running ones first. */
export function terminalRows(terminals: readonly TerminalDto[], sessions: readonly Pick<SessionDto, 'id' | 'title'>[]): TerminalRow[] {
  const status = (t: TerminalDto): string => (t.signal ? `Killed (${t.signal})` : t.exitCode === null ? 'Running' : t.exitCode === 0 ? 'Exited' : `Exited (${t.exitCode})`)
  return terminals
    .map((t) => ({
      id: `${t.sessionId}:${t.terminalId}`,
      chat: sessions.find((s) => s.id === t.sessionId)?.title || `Chat ${t.sessionId}`,
      command: [t.command, ...t.args].join(' '),
      cwd: t.cwd ?? '',
      status: status(t)
    }))
    .sort((a, b) => Number(b.status === 'Running') - Number(a.status === 'Running'))
}
