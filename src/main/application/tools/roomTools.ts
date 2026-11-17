import type { Id } from '@shared/models'
import type { RoomDto, RoomStateDto } from '@shared/teams'
import type { VPath } from '@shared/vfs'
import { AppError } from '../errors'
import type { TeamRoomService } from '../teams/TeamRoomService'
import type { TeamService } from '../teams/TeamService'
import type { ToolHandlers } from './catalog'
import { findNamed } from './teamsTools'
import type { ToolPaths } from './ToolPaths'
import { attempt, textResult } from './types'

export interface RoomToolsDeps {
  rooms: Pick<TeamRoomService, 'list' | 'create' | 'state' | 'rename' | 'remove' | 'say' | 'stop'>
  teams: Pick<TeamService, 'listTeams'>
  paths: Pick<ToolPaths, 'resolve'>
  /** The title of the calling chat: an agent posts in a room under it. */
  chatTitle(sessionId: Id): string
}

type Names = 'room_list' | 'room_read' | 'room_create' | 'room_rename' | 'room_delete' | 'room_post' | 'room_stop'

/** room_*: the team chat rooms of the caller's desktop (the same service the Team Chat window uses). */
export function createRoomTools({ rooms, teams, paths, chatTitle }: RoomToolsDeps): ToolHandlers<Names> {
  const find = (desktopId: Id, ref: number | string): RoomDto => {
    const list = rooms.list(desktopId)
    const hit = typeof ref === 'number' ? list.find((r) => r.id === ref) : list.find((r) => r.title.toLowerCase() === ref.trim().toLowerCase())
    if (!hit) throw new AppError(`There is no room "${ref}" on this desktop. Call room_list.`)
    return hit
  }
  const teamName = (id: Id): string => teams.listTeams().find((t) => t.id === id)?.name ?? `#${id}`
  const describe = (r: RoomDto): string => `[${r.id}] ${r.title}: team ${teamName(r.teamId)}, folder ${r.cwd}`
  const show = (state: RoomStateDto, last: number): string => {
    const members = state.members.map((m) => `${m.name} (${m.activity}${m.queued ? `, ${m.queued} queued` : ''})`).join(', ')
    const messages = state.messages.slice(-last).map((m) => `#${m.id} ${m.author}: ${m.text}`)
    return [describe(state.room), `Members: ${members || 'none'}`, messages.length ? messages.join('\n') : 'No messages yet.'].join('\n')
  }

  return {
    room_list: async (_args, { desktopId }) => {
      const list = rooms.list(desktopId)
      return textResult(list.length === 0 ? 'No team chat rooms.' : list.map(describe).join('\n'))
    },
    room_read: ({ room, last }, { desktopId }) => attempt(() => textResult(show(rooms.state(find(desktopId, room).id), last ?? 30))),
    room_create: ({ team, cwd }, context) =>
      attempt(() => {
        const found = findNamed(teams.listTeams(), team, 'team', 'team_list')
        const folder = cwd === undefined ? undefined : (paths.resolve(context, cwd) as VPath)
        return textResult(`Opened ${describe(rooms.create(context.desktopId, found.id, folder))}`)
      }),
    room_rename: ({ room, title }, { desktopId }) =>
      attempt(() => {
        const found = find(desktopId, room)
        rooms.rename(found.id, title)
        return textResult(`Renamed room [${found.id}] to ${title.trim()}.`)
      }),
    room_delete: ({ room }, { desktopId }) =>
      attempt(async () => {
        const found = find(desktopId, room)
        await rooms.remove(found.id)
        return textResult(`Deleted room [${found.id}] ${found.title}.`)
      }),
    room_post: ({ room, text }, { desktopId, sessionId }) =>
      attempt(async () => {
        const found = find(desktopId, room)
        // A member posting into its own room would post as an outsider under its name and call itself again.
        const self = rooms.state(found.id).members.find((m) => m.sessionId === sessionId)
        if (self) throw new AppError(`You are ${self.name}, a member of [${found.id}] ${found.title}: your final answer is posted there for you. Do not call room_post; reply with your answer.`)
        await rooms.say(found.id, text, chatTitle(sessionId))
        return textResult(`Posted in [${found.id}] ${found.title}. Call room_read to see the answers.`)
      }),
    room_stop: ({ room, member }, { desktopId }) =>
      attempt(async () => {
        const found = find(desktopId, room)
        const state = rooms.state(found.id)
        const hit = findNamed(state.members.map((m) => ({ ...m, id: m.profileId })), member, 'member', 'room_read')
        await rooms.stop(found.id, hit.profileId)
        return textResult(`Stopped ${hit.name} in [${found.id}] ${found.title}.`)
      })
  }
}
