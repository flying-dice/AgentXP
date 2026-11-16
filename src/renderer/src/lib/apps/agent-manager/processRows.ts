/** Pure row builders of the Agent Manager. */
import type { AgentProcessDto } from '@shared/desktop'
import type { AgentDto, SessionDto } from '@shared/models'
import { contextPercent, statusLabel } from '../../app/sessionStatus'

export type ProcessRow = {
  id: string
  agentId: number
  desktopId: number
  agent: string
  pid: string
  desktop: string
  chats: number
}

export function processRows(processes: readonly AgentProcessDto[], currentDesktopId: number): ProcessRow[] {
  return processes.map((p) => ({
    id: `${p.agentId}:${p.desktopId}`,
    agentId: p.agentId,
    desktopId: p.desktopId,
    agent: p.agentName,
    pid: p.pid === null ? '-' : String(p.pid),
    desktop: p.desktopId === currentDesktopId ? 'This desktop' : `Desktop ${p.desktopId}`,
    chats: p.sessionIds.length
  }))
}

export interface ChatRow {
  id: string
  title: string
  agent: string
  status: string
  context: string
  percent: number
}

export function chatRows(sessions: readonly SessionDto[], agents: readonly AgentDto[]): ChatRow[] {
  return sessions.map((s) => {
    const percent = contextPercent(s.contextUsed, s.contextSize)
    return {
      id: String(s.id),
      title: s.title || 'New chat',
      agent: agents.find((a) => a.id === s.agentId)?.name ?? `Agent ${s.agentId}`,
      status: statusLabel(s.status),
      context: s.contextSize > 0 ? `${percent}%` : '-',
      percent
    }
  })
}

/** Progress bar state for a context percentage: green, yellow from 70 %, red from 90 %. */
export const contextState = (percent: number): 'normal' | 'paused' | 'error' => (percent >= 90 ? 'error' : percent >= 70 ? 'paused' : 'normal')

export const formatTokens = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n))
