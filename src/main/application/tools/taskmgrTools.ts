import type { AgentProcessDto, DesktopState } from '@shared/desktop'
import type { AgentDto, Id, SessionDto, TerminalDto } from '@shared/models'
import { AppError } from '../errors'
import type { ToolHandlers } from './catalog'
import { findNamed } from './teamsTools'
import { attempt, textResult } from './types'

export interface TaskmgrToolsDeps {
  sessions: { list(desktopId: Id): SessionDto[]; terminalsOf(sessionId: Id): TerminalDto[]; cancel(sessionId: Id): Promise<void> }
  processes: { list(): AgentProcessDto[]; end(agentId: Id, desktopId: Id): Promise<void> }
  agents: { list(): AgentDto[] }
  desktops: { state(desktopId: Id): Pick<DesktopState, 'windows'>; openChat(desktopId: Id, sessionId: Id): void }
}

type Names = 'taskmgr_chats' | 'taskmgr_processes' | 'taskmgr_terminals' | 'taskmgr_open_chat' | 'taskmgr_end_task' | 'taskmgr_end_process'

const BUSY = new Set(['working', 'awaiting_permission', 'connecting'])
const mb = (bytes: number | null): string => (bytes === null ? '-' : `${Math.round(bytes / 1048576)} MB`)

/** taskmgr_*: what Task Manager shows (chats, agent programs, terminals) and its End Task / End process / Open chat. */
export function createTaskmgrTools({ sessions, processes, agents, desktops }: TaskmgrToolsDeps): ToolHandlers<Names> {
  const chatOf = (desktopId: Id, id: Id): SessionDto => {
    const hit = sessions.list(desktopId).find((s) => s.id === id)
    if (!hit) throw new AppError(`There is no chat ${id} on this desktop. Call taskmgr_chats.`)
    return hit
  }
  const agentName = (id: Id): string => agents.list().find((a) => a.id === id)?.name ?? `#${id}`

  return {
    taskmgr_chats: async (_args, { desktopId, sessionId }) => {
      const open = new Set(desktops.state(desktopId).windows.flatMap((w) => (w.view.app === 'chat' ? [w.view.sessionId] : [])))
      const list = sessions.list(desktopId)
      if (list.length === 0) return textResult('No chats.')
      return textResult(
        list
          .map((s) => {
            const context = s.contextSize > 0 ? `${Math.round((s.contextUsed / s.contextSize) * 100)}%` : '-'
            return `[${s.id}] ${s.title}${s.id === sessionId ? ' (you)' : ''}: agent ${agentName(s.agentId)}, window ${open.has(s.id) ? 'open' : 'closed'}, status ${s.status}${s.problem ? ` (${s.problem.message})` : ''}, context ${context}`
          })
          .join('\n')
      )
    },
    taskmgr_processes: async (_args, { desktopId }) => {
      const list = processes.list().filter((p) => p.desktopId === desktopId)
      return textResult(
        list.length === 0
          ? 'No agent programs are running on this desktop.'
          : list.map((p) => `${p.agentName} [agent ${p.agentId}]: PID ${p.pid ?? '-'}, chats ${p.sessionIds.join(', ')}, memory ${mb(p.memoryBytes)}, CPU ${p.cpuPercent === null ? '-' : `${Math.round(p.cpuPercent)}%`}`).join('\n')
      )
    },
    taskmgr_terminals: ({ chat }, { desktopId }) =>
      attempt(() => {
        const chats = chat === undefined ? sessions.list(desktopId) : [chatOf(desktopId, chat)]
        const rows = chats.flatMap((s) =>
          sessions.terminalsOf(s.id).map((t) => `chat ${s.id}: ${[t.command, ...t.args].join(' ')} (${t.exitCode === null && t.signal === null ? 'running' : `exited ${t.exitCode ?? t.signal}`}) in ${t.cwd ?? '-'}`)
        )
        return textResult(rows.join('\n') || 'No terminals.')
      }),
    taskmgr_open_chat: ({ chat }, { desktopId }) =>
      attempt(() => {
        const found = chatOf(desktopId, chat)
        desktops.openChat(desktopId, found.id)
        return textResult(`Opened the chat [${found.id}] ${found.title}.`)
      }),
    taskmgr_end_task: ({ chat }, { desktopId, sessionId }) =>
      attempt(async () => {
        if (chat === sessionId) throw new AppError('That is your own chat. End your turn instead.')
        const found = chatOf(desktopId, chat)
        if (!BUSY.has(found.status)) throw new AppError(`The chat [${found.id}] is not busy (status ${found.status}).`)
        await sessions.cancel(found.id)
        return textResult(`Ended the turn of the chat [${found.id}] ${found.title}.`)
      }),
    taskmgr_end_process: ({ agent }, { desktopId }) =>
      attempt(async () => {
        const running = processes.list().filter((p) => p.desktopId === desktopId)
        const found = findNamed(running.map((p) => ({ ...p, id: p.agentId, name: p.agentName })), agent, 'running agent program', 'taskmgr_processes')
        await processes.end(found.agentId, desktopId)
        return textResult(`Ended ${found.agentName}. Its chats (${found.sessionIds.join(', ')}) stopped.`)
      })
  }
}
