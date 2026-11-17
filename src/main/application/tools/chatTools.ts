import type { SessionDto } from '@shared/models'
import type { SessionRepository } from '../../domain/repositories/session-repository'
import type { TranscriptRepository } from '../../domain/repositories/transcript-repository'
import { AppError } from '../errors'
import { transcriptToMarkdown } from '../transcriptMarkdown'
import type { ToolHandlers } from './catalog'
import type { DesktopOps } from './ports'
import { attempt, errorResult, textResult, type ToolContext, type ToolResult } from './types'

export interface ChatToolsDeps {
  desktops: Pick<DesktopOps, 'state' | 'openWindow' | 'policy'>
  sessions: Pick<SessionRepository, 'get' | 'listByDesktop'>
  transcripts: Pick<TranscriptRepository, 'list'>
  /** Puts a permission request in front of the user; true when allowed. */
  ask(sessionId: number, title: string, reason: string): Promise<boolean>
}

export const CHATS_LIST_DEFAULT = 20
export const CHAT_READ_DEFAULT = 20_000

/** One chat as a line of chats_list. */
function chatLine(chat: SessionDto, open: boolean, self: boolean): string {
  const marks = [open ? 'open in a window' : 'closed', ...(self ? ['this chat'] : [])].join(', ')
  return `${chat.id}  "${chat.title}"  ${chat.status}  ${chat.cwd}  last activity ${chat.updatedAt}  (${marks})`
}

/**
 * chats_*, chat_*: the chats of the desktop as an agent sees them (always available, like Start > Recent chats). A
 * chat outlives its window; these tools list the chats, read one's transcript and open one again.
 */
export function createChatTools({ desktops, sessions, transcripts, ask }: ChatToolsDeps): ToolHandlers<'chats_list' | 'chat_read' | 'chat_open'> {
  /** The chats the user sees under Recent chats: not the reviewer of a Code Review window or a pane chat still in its window. */
  const chatsOf = (desktopId: number): SessionDto[] => sessions.listByDesktop(desktopId).filter((s) => s.role === 'chat')

  const chatOf = (context: ToolContext, id: number): SessionDto => {
    const chat = sessions.get(id)
    if (!chat || chat.desktopId !== context.desktopId || chat.role !== 'chat') throw new AppError(`Chat ${id} is not a chat of this desktop. Call chats_list to see them.`)
    return chat
  }

  const openChatIds = (desktopId: number): Set<number> =>
    new Set(desktops.state(desktopId).windows.flatMap((w) => (w.view.app === 'chat' ? [w.view.sessionId] : [])))

  const mayOpen = async (context: ToolContext): Promise<ToolResult | null> => {
    const decision = desktops.policy().openApps
    if (decision === 'deny') return errorResult('Opening apps is blocked by the permission policy in Control Center.')
    if (decision === 'ask' && !(await ask(context.sessionId, 'Open a chat window', 'Agent may open apps is set to Ask in Control Center'))) {
      return errorResult('The user declined to open the chat window.')
    }
    return null
  }

  return {
    chats_list: (args, context) =>
      attempt(() => {
        const query = args.query?.trim().toLowerCase()
        const all = chatsOf(context.desktopId).filter((c) => !query || c.title.toLowerCase().includes(query))
        if (all.length === 0) return textResult(query ? `No chat title contains "${args.query}".` : 'This desktop has no chats yet.')
        const open = openChatIds(context.desktopId)
        const shown = all.slice(0, args.limit ?? CHATS_LIST_DEFAULT)
        const more = all.length - shown.length
        const lines = shown.map((c) => chatLine(c, open.has(c.id), c.id === context.sessionId))
        return textResult([...lines, ...(more > 0 ? [`... and ${more} older chats (pass a larger limit).`] : [])].join('\n'))
      }),

    chat_read: (args, context) =>
      attempt(() => {
        const chat = chatOf(context, args.chat)
        const markdown = transcriptToMarkdown(chat, transcripts.list(chat.id))
        const max = args.maxChars ?? CHAT_READ_DEFAULT
        if (markdown.length <= max) return textResult(markdown)
        return textResult(`[The first ${markdown.length - max} characters are left out. Pass a larger maxChars to read them.]\n\n…${markdown.slice(markdown.length - max)}`)
      }),

    chat_open: async (args, context) => {
      const found = await attempt(() => (chatOf(context, args.chat), textResult('')))
      if (found.isError) return found
      const refused = await mayOpen(context)
      if (refused) return refused
      return attempt(() => {
        const window = desktops.openWindow({ desktopId: context.desktopId, app: 'chat', sessionId: args.chat }, 'agent')
        return textResult(`Opened chat ${args.chat} ("${window.title}") in Chat window ${window.id}, with its history.`)
      })
    }
  }
}
