import { computeDiff, splitLines } from '@shared/diff'
import { commentLocation, formatReviewHandback, type ReviewChangeDto } from '@shared/review'
import type { Id } from '@shared/models'
import { AppError } from '../errors'
import type { ReviewService, ReviewTarget } from '../review/ReviewService'
import type { ToolHandlers } from './catalog'
import { attempt, textResult } from './types'

export interface ReviewToolsDeps {
  reviews: Pick<ReviewService, 'requireWindow' | 'changes' | 'file' | 'state' | 'addComment' | 'submit'>
}

const MAX_DIFF_CHARS = 60_000
const STATUS_LETTER: Record<ReviewChangeDto['status'], string> = { modified: 'M', added: 'A', deleted: 'D', renamed: 'R', untracked: '?' }

const pad = (n: number | undefined, width: number): string => String(n ?? '').padStart(width, ' ')

/** review_list_changes, review_read_diff, review_add_comment, review_submit. The review session of a Code Review window and the chats of its desktop use them; comments always land in that window. */
export function createReviewTools({ reviews }: ReviewToolsDeps): ToolHandlers<'review_list_changes' | 'review_read_diff' | 'review_add_comment' | 'review_submit'> {
  /** The window the call acts on (see `ReviewService.requireWindow`); refuses sessions of another desktop. */
  const target = (sessionId: Id, desktopId: Id): ReviewTarget => {
    const window = reviews.requireWindow(sessionId)
    if (window.desktopId !== desktopId) throw new AppError('The review belongs to another desktop.')
    return window
  }

  return {
    review_list_changes: (_args, { sessionId, desktopId }) =>
      attempt(async () => {
        const { root, baseRef, reviewSessionId } = target(sessionId, desktopId)
        const changes = await reviews.changes(desktopId, root, baseRef)
        if (changes.length === 0) return textResult(`No changes in ${root} against ${baseRef}.`)
        const comments = reviews.state(reviewSessionId).comments
        const rows = changes.map((c) => {
          const open = comments.filter((x) => x.path === c.path && x.state === 'open').length
          const counts = c.binary ? 'binary' : `+${c.additions} -${c.deletions}`
          return `${STATUS_LETTER[c.status]} ${c.path}${c.oldPath ? ` (was ${c.oldPath})` : ''}  ${counts}${open > 0 ? `  ${open} open comment${open === 1 ? '' : 's'}` : ''}`
        })
        return textResult(`${changes.length} changed file${changes.length === 1 ? '' : 's'} in ${root} against ${baseRef} (M modified, A added, D deleted, R renamed, ? untracked):\n${rows.join('\n')}`)
      }),

    review_read_diff: ({ path }, { sessionId, desktopId }) =>
      attempt(async () => {
        const { root, baseRef } = target(sessionId, desktopId)
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
        const { root, baseRef, reviewSessionId } = target(sessionId, desktopId)
        const file = await reviews.file(desktopId, root, baseRef, path) // refuses a path that is not a changed file
        const total = splitLines(side === 'old' ? file.oldText : file.newText).length
        const last = Math.max(line, endLine ?? line)
        if (!file.binary && last > total) throw new AppError(`${path} has only ${total} ${side === 'old' ? 'old' : 'new'} lines; line ${last} does not exist. Use the line numbers of review_read_diff.`)
        const comment = reviews.addComment(reviewSessionId, { path, lineStart: line, lineEnd: endLine, side, severity, body, parentId: replyTo ?? null }, 'agent')
        return textResult(`Comment ${comment.id} added at ${commentLocation(comment)} [${comment.severity}].`)
      }),

    review_submit: ({ verdict, body }, { sessionId, desktopId }) =>
      attempt(() => {
        const { reviewSessionId, owner } = target(sessionId, desktopId)
        const summary = reviews.submit(reviewSessionId, verdict, body)
        const comments = reviews.state(reviewSessionId).comments
        // A chat that reviewed for the user gets the verdict and the comments back to report them where the user asked.
        if (!owner) return textResult(formatReviewHandback(summary, comments))
        return textResult(`Review submitted: ${summary.verdict} with ${comments.length} comment${comments.length === 1 ? '' : 's'}.`)
      })
  }
}
