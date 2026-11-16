/** Pure row builders of the Agent Manager. */
import type { AgentProcessDto } from '@shared/desktop'
import type { AguiToolCallState } from '@shared/agui-state'
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

/** The tab Task Manager opens on (UX-130): Processes when a chat has a problem or is still working (the user is there to stop the program), else Chats. */
export function initialTab(sessions: readonly Pick<SessionDto, 'status' | 'problem'>[]): 'chats' | 'processes' {
  return sessions.some((s) => s.problem || s.status === 'error' || s.status === 'working') ? 'processes' : 'chats'
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

/** `progress` tells what a chat is doing now (the running tool); a working chat then shows it beside its status (UX-163). */
/** `Working: Step 12 of 30`; the status alone when there is nothing to add. */
export const withProgress = (status: string, progress: string | null): string => (progress ? `${status}: ${progress}` : status)

export function chatRows(sessions: readonly SessionDto[], agents: readonly AgentDto[], progress: (sessionId: number) => string | null = () => null): ChatRow[] {
  return sessions.map((s) => {
    const percent = contextPercent(s.contextUsed, s.contextSize)
    return {
      id: String(s.id),
      title: s.title || 'New chat',
      agent: agents.find((a) => a.id === s.agentId)?.name ?? `Removed agent (${s.agentId})`,
      status: withProgress(chatStatusText(s.status), isBusy(s.status) ? progress(s.id) : null),
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

/** The title of the tool call that is running in a chat ("Step 12 of 30"), the last one when several are; null when none. */
export function runningToolTitle(toolCalls: Record<string, Pick<AguiToolCallState, 'status' | 'title'>>): string | null {
  const calls = Object.values(toolCalls)
  for (let i = calls.length - 1; i >= 0; i--) if (calls[i].status === 'pending' || calls[i].status === 'in_progress') return calls[i].title || null
  return null
}
