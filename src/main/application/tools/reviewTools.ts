import { computeDiff, splitLines } from '@shared/diff'
import { commentLocation, type ReviewChangeDto } from '@shared/review'
import type { Id } from '@shared/models'
import { AppError } from '../errors'
import type { ReviewService } from '../review/ReviewService'
import type { ToolHandlers } from './catalog'
import { attempt, textResult } from './types'

export interface ReviewToolsDeps {
  reviews: Pick<ReviewService, 'requireWindow' | 'changes' | 'file' | 'state' | 'addComment' | 'submit'>
}

const MAX_DIFF_CHARS = 60_000
const STATUS_LETTER: Record<ReviewChangeDto['status'], string> = { modified: 'M', added: 'A', deleted: 'D', renamed: 'R', untracked: '?' }

const pad = (n: number | undefined, width: number): string => String(n ?? '').padStart(width, ' ')

/** review_list_changes, review_read_diff, review_add_comment, review_submit. Every handler is scoped to the review session that owns a Code Review window. */
export function createReviewTools({ reviews }: ReviewToolsDeps): ToolHandlers<'review_list_changes' | 'review_read_diff' | 'review_add_comment' | 'review_submit'> {
  /** The window the calling session owns; refuses chats, other reviews and sessions of another desktop. */
  const owned = (sessionId: Id, desktopId: Id): { desktopId: Id; root: string; baseRef: string } => {
    const window = reviews.requireWindow(sessionId)
    if (window.desktopId !== desktopId) throw new AppError('The review belongs to another desktop.')
    return window
  }

  return {
    review_list_changes: (_args, { sessionId, desktopId }) =>
      attempt(async () => {
        const { root, baseRef } = owned(sessionId, desktopId)
        const changes = await reviews.changes(desktopId, root, baseRef)
        if (changes.length === 0) return textResult(`No changes in ${root} against ${baseRef}.`)
        const comments = reviews.state(sessionId).comments
        const rows = changes.map((c) => {
          const open = comments.filter((x) => x.path === c.path && x.state === 'open').length
          const counts = c.binary ? 'binary' : `+${c.additions} -${c.deletions}`
          return `${STATUS_LETTER[c.status]} ${c.path}${c.oldPath ? ` (was ${c.oldPath})` : ''}  ${counts}${open > 0 ? `  ${open} open comment${open === 1 ? '' : 's'}` : ''}`
        })
        return textResult(`${changes.length} changed file${changes.length === 1 ? '' : 's'} in ${root} against ${baseRef} (M modified, A added, D deleted, R renamed, ? untracked):\n${rows.join('\n')}`)
      }),

    review_read_diff: ({ path }, { sessionId, desktopId }) =>
      attempt(async () => {
        const { root, baseRef } = owned(sessionId, desktopId)
        const file = await reviews.file(desktopId, root, baseRef, path)
        if (file.binary) return textResult(`${path} is a binary file; there is no text diff.`)
        if (file.tooLarge) return textResult(`${path} is too large to review here.`)
        const hunks = computeDiff(file.oldText, file.newText, 3)
        const header = `${path} (${file.status}${file.oldPath ? `, was ${file.oldPath}` : ''}), ${splitLines(file.newText).length} lines now`
        if (hunks.length === 0) return textResult(`${header}\nNo textual change.`)
        const width = String(Math.max(splitLines(file.oldText).length, splitLines(file.newText).length)).length
        const out = [header]
        for (const hunk of hunks) {
          out.push(hunk.header)
          for (const line of hunk.lines) {
            if (line.kind === 'add') out.push(`+ ${pad(line.newNo, width)} | ${line.text}`)
            else if (line.kind === 'del') out.push(`- ${pad(line.oldNo, width)} | ${line.text}`)
            else out.push(`  ${pad(line.newNo, width)} | ${line.text}`)
          }
        }
        const text = out.join('\n')
        return textResult(text.length > MAX_DIFF_CHARS ? `${text.slice(0, MAX_DIFF_CHARS)}\n... (diff cut at ${MAX_DIFF_CHARS} characters)` : text)
      }),

    review_add_comment: ({ path, line, endLine, side, severity, body, replyTo }, { sessionId, desktopId }) =>
      attempt(async () => {
        const { root, baseRef } = owned(sessionId, desktopId)
        const file = await reviews.file(desktopId, root, baseRef, path) // refuses a path that is not a changed file
        const total = splitLines(side === 'old' ? file.oldText : file.newText).length
        const last = Math.max(line, endLine ?? line)
        if (!file.binary && last > total) throw new AppError(`${path} has only ${total} ${side === 'old' ? 'old' : 'new'} lines; line ${last} does not exist. Use the line numbers of review_read_diff.`)
        const comment = reviews.addComment(sessionId, { path, lineStart: line, lineEnd: endLine, side, severity, body, parentId: replyTo ?? null }, 'agent')
        return textResult(`Comment ${comment.id} added at ${commentLocation(comment)} [${comment.severity}].`)
      }),

    review_submit: ({ verdict, body }, { sessionId, desktopId }) =>
      attempt(() => {
        owned(sessionId, desktopId)
        const summary = reviews.submit(sessionId, verdict, body)
        const count = reviews.state(sessionId).comments.length
        return textResult(`Review submitted: ${summary.verdict} with ${count} comment${count === 1 ? '' : 's'}.`)
      })
  }
}
