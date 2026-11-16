import { execFileSync } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { SqliteAppWindowRepository } from '../../infrastructure/db/sqlite-app-window-repository'
import { SqliteReviewRepository } from '../../infrastructure/db/sqlite-review-repository'
import { SqliteStickyNoteRepository } from '../../infrastructure/db/sqlite-sticky-note-repository'
import { SqliteToolPolicyRepository } from '../../infrastructure/db/sqlite-tool-policy-repository'
import { ExecGitCli } from '../../infrastructure/git/ExecGitCli'
import { DesktopService } from '../desktop/DesktopService'
import { ToolGateway } from '../desktop/ToolGateway'
import { ReviewService, parseNameStatus } from '../review/ReviewService'
import { createVfsFixture } from '../test-helpers'
import { DesktopToolService } from './DesktopToolService'
import { createReviewTools } from './reviewTools'
import { createShellTools } from './shellTools'
import { ToolPaths } from './ToolPaths'
import type { ToolResult } from './types'

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=T', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' })

const textOf = (r: ToolResult): string => r.content.map((c) => (c.type === 'text' ? c.text : '')).join('\n')

let f: Awaited<ReturnType<typeof createVfsFixture>>
let desktops: DesktopService
let reviews: ReviewService
let reviewRepo: SqliteReviewRepository
let tools: DesktopToolService
let desktopId: number
let chatId: number
let reviewId: number
let removed: number[]

const call = (tool: string, args: unknown = {}, sessionId = reviewId): Promise<ToolResult> => tools.call({ sessionId, desktopId }, tool, args)

beforeEach(async () => {
  f = await createVfsFixture()
  desktopId = f.desktop.id
  const dir = f.projectDir
  git(dir, 'init', '-q', '-b', 'main')
  await mkdir(join(dir, 'src'), { recursive: true })
  await writeFile(join(dir, 'src', 'a.ts'), 'one\ntwo\nthree\nfour\n')
  await writeFile(join(dir, 'keep.txt'), 'keep\n')
  await writeFile(join(dir, 'gone.txt'), 'bye\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'init')
  // Working tree: a modified, one deleted, one untracked.
  await writeFile(join(dir, 'src', 'a.ts'), 'one\nTWO\nthree\nfour\nfive\n')
  await rm(join(dir, 'gone.txt'))
  await writeFile(join(dir, 'new.txt'), 'brand\nnew\n')

  removed = []
  const sessions = f.repos.sessions
  desktops = new DesktopService({
    desktops: f.repos.desktops,
    windows: new SqliteAppWindowRepository(f.db),
    policies: new SqliteToolPolicyRepository(f.db),
    agents: f.repos.agents,
    sessions,
    notes: new SqliteStickyNoteRepository(f.db),
    surfaces: f.repos.surfaces,
    chats: {
      create: async (desktop, agentId, cwd, role) => sessions.create({ agentId: agentId ?? f.agentId, desktopId: desktop, cwd, title: role ?? 'chat', role }),
      cancel: async () => {},
      remove: async (id) => {
        removed.push(id)
        sessions.remove(id)
      }
    },
    drives: f.drives,
    events: f.publisher
  })
  reviewRepo = new SqliteReviewRepository(f.db)
  reviews = new ReviewService({ reviews: reviewRepo, sessions, vfs: f.vfs, cli: new ExecGitCli(), events: f.publisher, states: desktops })
  const gateway = new ToolGateway({
    desktops,
    broker: { prompt: async () => ({ outcome: 'selected', optionId: 'allow' }), observe: () => () => {} },
    events: { publish: () => {} }
  })
  tools = new DesktopToolService({
    states: desktops,
    gate: gateway,
    handlers: { ...createShellTools({ desktops, paths: new ToolPaths(f.vfs, sessions), ask: async () => true }), ...createReviewTools({ reviews }) } as never
  })
  const chat = await desktops.newChat(desktopId, undefined, 'E:\\')
  chatId = chat.view.app === 'chat' ? chat.view.sessionId : 0
  const review = await desktops.openReview(desktopId, 'E:\\')
  reviewId = review.view.app === 'code-review' ? review.view.sessionId : 0
})

describe('ReviewService.changes', () => {
  it('lists modified, deleted and untracked files with line counts', async () => {
    const changes = await reviews.changes(desktopId, 'E:\\', 'HEAD')
    expect(changes).toEqual([
      { path: 'gone.txt', status: 'deleted', additions: 0, deletions: 1, binary: false },
      { path: 'new.txt', status: 'untracked', additions: 2, deletions: 0, binary: false },
      { path: 'src/a.ts', status: 'modified', additions: 2, deletions: 1, binary: false }
    ])
  })

  it('compares against another ref', async () => {
    git(f.projectDir, 'add', '-A')
    git(f.projectDir, 'commit', '-q', '-m', 'second')
    expect(await reviews.changes(desktopId, 'E:\\', 'HEAD')).toEqual([])
    expect((await reviews.changes(desktopId, 'E:\\', 'HEAD~1')).map((c) => c.path)).toEqual(['gone.txt', 'new.txt', 'src/a.ts'])
  })

  it('reads both sides of a file, and refuses unsafe refs, unknown refs and files that did not change', async () => {
    expect(await reviews.file(desktopId, 'E:\\', 'HEAD', 'src/a.ts')).toMatchObject({ status: 'modified', oldText: 'one\ntwo\nthree\nfour\n', newText: 'one\nTWO\nthree\nfour\nfive\n', binary: false })
    expect(await reviews.file(desktopId, 'E:\\', 'HEAD', 'gone.txt')).toMatchObject({ status: 'deleted', oldText: 'bye\n', newText: '' })
    expect(await reviews.file(desktopId, 'E:\\', 'HEAD', 'new.txt')).toMatchObject({ status: 'untracked', oldText: '', newText: 'brand\nnew\n' })
    await expect(reviews.file(desktopId, 'E:\\', 'HEAD', 'keep.txt')).rejects.toThrow(/no changes/)
    await expect(reviews.changes(desktopId, 'E:\\', '--output=x')).rejects.toThrow(/not a valid git ref/i)
    await expect(reviews.changes(desktopId, 'E:\\', 'nope')).rejects.toThrow(/Unknown git ref/)
  })

  it('answers nothing outside a repository, and treats a repository without commits as all new', async () => {
    expect(await reviews.changes(desktopId, 'C:\\Users\\Agent', 'HEAD')).toEqual([])
    expect(await reviews.changes(desktopId, 'Q:\\', 'HEAD')).toEqual([])
    const fresh = await createVfsFixture()
    git(fresh.projectDir, 'init', '-q', '-b', 'main')
    await writeFile(join(fresh.projectDir, 'x.txt'), 'x\n')
    const service = new ReviewService({ reviews: reviewRepo, sessions: f.repos.sessions, vfs: fresh.vfs, cli: new ExecGitCli(), events: fresh.publisher, states: desktops })
    expect(await service.changes(fresh.desktop.id, 'E:\\', 'HEAD')).toEqual([{ path: 'x.txt', status: 'untracked', additions: 1, deletions: 0, binary: false }])
  })

  it('parses name-status output with renames', () => {
    expect(parseNameStatus('M\0a.ts\0R100\0old.ts\0new.ts\0D\0gone.ts\0T\0t.ts\0')).toEqual([
      { status: 'modified', path: 'a.ts' },
      { status: 'renamed', path: 'new.ts', oldPath: 'old.ts' },
      { status: 'deleted', path: 'gone.ts' },
      { status: 'modified', path: 't.ts' }
    ])
  })
})

describe('review tools', () => {
  it('review_list_changes lists the files with counts', async () => {
    const res = await call('review_list_changes')
    expect(res.isError).toBeFalsy()
    const text = textOf(res)
    expect(text).toContain('3 changed files')
    expect(text).toContain('M src/a.ts  +2 -1')
    expect(text).toContain('? new.txt  +2 -0')
    expect(text).toContain('D gone.txt  +0 -1')
  })

  it('review_read_diff prints numbered added, removed and context lines', async () => {
    const text = textOf(await call('review_read_diff', { path: 'src/a.ts' }))
    expect(text).toContain('src/a.ts (modified)')
    expect(text).toContain('- 2 | two')
    expect(text).toContain('+ 2 | TWO')
    expect(text).toContain('+ 5 | five')
    expect(text).toContain('  1 | one')
    expect((await call('review_read_diff', { path: 'keep.txt' })).isError).toBe(true)
  })

  it('review_add_comment stores an agent comment and tells the window (review.changed)', async () => {
    const res = await call('review_add_comment', { path: 'src/a.ts', line: 2, severity: 'blocker', body: 'Do not shout' })
    expect(res.isError).toBeFalsy()
    expect(textOf(res)).toContain('src/a.ts:2 [blocker]')
    expect(reviewRepo.listComments(reviewId)).toMatchObject([{ path: 'src/a.ts', lineStart: 2, side: 'new', severity: 'blocker', author: 'agent', state: 'open', body: 'Do not shout' }])
    expect(f.publisher.payloads('review.changed')).toContainEqual({ desktopId, sessionId: reviewId })
    const list = textOf(await call('review_list_changes'))
    expect(list).toContain('1 open comment')
  })

  it('review_add_comment refuses files that did not change and lines that do not exist, and takes replies and old-side comments', async () => {
    expect((await call('review_add_comment', { path: 'keep.txt', line: 1, body: 'x' })).isError).toBe(true)
    const tooFar = await call('review_add_comment', { path: 'src/a.ts', line: 40, body: 'x' })
    expect(tooFar.isError).toBe(true)
    expect(textOf(tooFar)).toContain('only 5 new lines')
    const first = reviewRepo.addComment({ sessionId: reviewId, path: 'src/a.ts', lineStart: 1, lineEnd: 1, side: 'new', body: 'root', severity: 'minor', author: 'user', parentId: null })
    expect((await call('review_add_comment', { path: 'src/a.ts', line: 1, body: 'answer', replyTo: first.id })).isError).toBeFalsy()
    expect((await call('review_add_comment', { path: 'gone.txt', line: 1, side: 'old', body: 'why delete?' })).isError).toBeFalsy()
    expect(reviewRepo.listComments(reviewId).map((c) => [c.side, c.parentId])).toEqual([['new', null], ['new', first.id], ['old', null]])
  })

  it('review_submit stores the verdict (and replaces it)', async () => {
    expect(textOf(await call('review_submit', { verdict: 'request_changes', body: 'Two things' }))).toContain('request_changes')
    expect(reviewRepo.getSummary(reviewId)).toMatchObject({ verdict: 'request_changes', body: 'Two things' })
    await call('review_submit', { verdict: 'approve', body: 'Fixed' })
    expect(reviewRepo.getSummary(reviewId)?.verdict).toBe('approve')
    expect((await call('review_submit', { verdict: 'maybe', body: '' })).isError).toBe(true)
  })
})

describe('review_open', () => {
  it('opens a Code Review window for the chat\'s project, which enables the review tools; reuses it the second time', async () => {
    desktops.closeWindow(desktops.state(desktopId).windows.find((w) => w.app === 'code-review')!.id)
    expect(tools.enabledGroups(desktopId)).not.toContain('review')
    const first = await call('review_open', {}, chatId)
    expect(first.isError).toBeFalsy()
    expect(textOf(first)).toContain('review_add_comment')
    expect(desktops.state(desktopId).windows.filter((w) => w.app === 'code-review')).toHaveLength(1)
    expect(tools.enabledGroups(desktopId)).toContain('review')
    expect(textOf(await call('review_open', { path: 'E:\\' }, chatId))).toContain('Using the open')
    expect(desktops.state(desktopId).windows.filter((w) => w.app === 'code-review')).toHaveLength(1)
    expect((await call('review_add_comment', { path: 'src/a.ts', line: 1, body: 'x' }, chatId)).isError).toBeFalsy()
  })

  it('refuses a bad ref', async () => {
    expect((await call('review_open', { baseRef: '--bad' }, chatId)).isError).toBe(true)
  })
})

describe('session scoping', () => {
  it('a chat on the same desktop reviews in the Code Review window: comments land under the window\'s review session', async () => {
    expect(tools.enabledGroups(desktopId)).toContain('review')
    expect(textOf(await call('review_list_changes', {}, chatId))).toContain('3 changed files')
    expect(textOf(await call('review_read_diff', { path: 'src/a.ts' }, chatId))).toContain('+ 2 | TWO')
    const added = await call('review_add_comment', { path: 'src/a.ts', line: 2, severity: 'major', body: 'Shouting' }, chatId)
    expect(added.isError).toBeFalsy()
    expect(reviewRepo.listComments(reviewId)).toMatchObject([{ path: 'src/a.ts', lineStart: 2, author: 'agent', body: 'Shouting' }])
    expect(reviewRepo.listComments(chatId)).toEqual([])
    expect(f.publisher.payloads('review.changed')).toContainEqual({ desktopId, sessionId: reviewId })
  })

  it('submitting from a chat stores the verdict on the window and hands the verdict and the comments back to that chat', async () => {
    await call('review_add_comment', { path: 'src/a.ts', line: 2, severity: 'blocker', body: 'Shouting' }, chatId)
    const text = textOf(await call('review_submit', { verdict: 'request_changes', body: 'One thing' }, chatId))
    expect(text).toContain('Changes requested. One thing')
    expect(text).toContain('src/a.ts:2 [blocker] Shouting')
    expect(text).toContain('here in the chat')
    expect(reviewRepo.getSummary(reviewId)).toMatchObject({ verdict: 'request_changes', body: 'One thing' })
    expect(reviewRepo.getSummary(chatId)).toBeNull()
    // The review session itself keeps its terse answer.
    expect(textOf(await call('review_submit', { verdict: 'approve', body: '' }))).toBe('Review submitted: approve with 1 comment.')
  })

  it('the chat pane (aside) of a Code window uses the review tools too', async () => {
    const aside = f.repos.sessions.create({ agentId: f.agentId, desktopId, cwd: 'E:\\', title: 'aside', role: 'aside' })
    const res = await call('review_add_comment', { path: 'src/a.ts', line: 1, body: 'from the aside' }, aside.id)
    expect(res.isError).toBeFalsy()
    expect(reviewRepo.listComments(reviewId).map((c) => c.body)).toEqual(['from the aside'])
  })

  it('a chat picks the focused review window of its project, and any review window when its project has none', async () => {
    const other = await desktops.openReview(desktopId, 'E:\\', 'main')
    const otherSession = other.view.app === 'code-review' ? other.view.sessionId : 0
    desktops.focusWindow(other.id, 'user')
    await call('review_add_comment', { path: 'src/a.ts', line: 1, body: 'x' }, chatId)
    expect(reviewRepo.listComments(otherSession)).toHaveLength(1)
    expect(reviewRepo.listComments(reviewId)).toEqual([])
    const elsewhere = f.repos.sessions.create({ agentId: f.agentId, desktopId, cwd: 'C:\\Users\\Agent', title: 'home chat' })
    expect((await call('review_list_changes', {}, elsewhere.id)).isError).toBeFalsy()
  })

  it('without a Code Review window the error says to call review_open', async () => {
    const window = desktops.state(desktopId).windows.find((w) => w.app === 'code-review')!
    desktops.closeWindow(window.id)
    const res = await call('review_list_changes', {}, chatId)
    expect(res.isError).toBe(true)
    expect(textOf(res)).toContain('review_open')
    expect(textOf(res)).not.toContain('external tools')
  })

  it('a chat of another desktop is refused', async () => {
    const other = f.repos.desktops.create({ agentId: f.agentId, title: 'Other', isOpen: false })
    const res = await tools.call({ sessionId: chatId, desktopId: other.id }, 'review_list_changes', {})
    expect(res.isError).toBe(true)
  })

  it('refuses another review session that has no window of its own', async () => {
    const orphan = f.repos.sessions.create({ agentId: f.agentId, desktopId, title: 'orphan', role: 'review' })
    const res = await call('review_list_changes', {}, orphan.id)
    expect(res.isError).toBe(true)
    expect(textOf(res)).toContain('review_open')
  })

  it('a review session only works on its own desktop', async () => {
    const other = f.repos.desktops.create({ agentId: f.agentId, title: 'Other', isOpen: false })
    const res = await tools.call({ sessionId: reviewId, desktopId: other.id }, 'review_list_changes', {})
    expect(res.isError).toBe(true)
  })

  it('refuses everything once the review window is closed', async () => {
    const window = desktops.state(desktopId).windows.find((w) => w.app === 'code-review')!
    desktops.closeWindow(window.id)
    expect(tools.enabledGroups(desktopId)).not.toContain('review')
    const res = await call('review_list_changes')
    expect(res.isError).toBe(true)
    // The window owned the session, so the session is gone with it and nothing resolves.
    expect(textOf(res)).toContain('review_open')
    expect(f.repos.sessions.get(reviewId)).toBeNull()
  })
})

describe('the review window owns its session', () => {
  it('openReview creates a review session in the folder and a Code Review window with its view', () => {
    const state = desktops.state(desktopId)
    const window = state.windows.find((w) => w.app === 'code-review')!
    expect(window.view).toEqual({ app: 'code-review', root: 'E:\\', baseRef: 'HEAD', selectedPath: null, sessionId: reviewId })
    expect(window.title).toMatch(/^Review - /)
    expect(f.repos.sessions.get(reviewId)).toMatchObject({ role: 'review', cwd: 'E:\\', desktopId })
    expect(state.tools).toEqual(expect.arrayContaining(['review', 'fs.read']))
  })

  it('keeps the base ref and the selected file when the view is updated', () => {
    const window = desktops.state(desktopId).windows.find((w) => w.app === 'code-review')!
    desktops.updateView(window.id, { app: 'code-review', root: 'E:\\', baseRef: 'HEAD~1', selectedPath: 'src/a.ts', sessionId: reviewId })
    expect(desktops.state(desktopId).windows.find((w) => w.app === 'code-review')!.view).toMatchObject({ baseRef: 'HEAD~1', selectedPath: 'src/a.ts' })
    const record = new SqliteAppWindowRepository(f.db).get(window.id)
    expect(record).toMatchObject({ path: 'E:\\', baseRef: 'HEAD~1', sessionId: reviewId })
  })

  it('opens one window per review (several reviews can be open), and the chat list does not include them', async () => {
    await desktops.openReview(desktopId, 'E:\\', 'main')
    expect(desktops.state(desktopId).windows.filter((w) => w.app === 'code-review')).toHaveLength(2)
    expect(f.repos.sessions.listByDesktop(desktopId).filter((s) => s.role === 'chat').map((s) => s.id)).toEqual([chatId])
  })

  it('opens on the file that was asked for, so the first view already shows it', async () => {
    const opened = await desktops.openReview(desktopId, 'E:\\', 'HEAD', undefined, 'src/redirect.ts')
    expect(opened.view).toMatchObject({ app: 'code-review', selectedPath: 'src/redirect.ts' })
    expect(desktops.state(desktopId).windows.find((w) => w.id === opened.id)!.view).toMatchObject({ selectedPath: 'src/redirect.ts' })
  })

  it('refuses a bad ref and a window without a review session', async () => {
    await expect(desktops.openReview(desktopId, 'E:\\', '--bad')).rejects.toThrow(/valid git ref/)
    expect(() => desktops.openWindow({ desktopId, app: 'code-review' })).toThrow(/review session/)
    expect(() => desktops.openWindow({ desktopId, app: 'code-review', sessionId: chatId })).toThrow(/review session/)
  })

  it('closing the window deletes the review session and its comments; closing a chat window keeps the chat', async () => {
    reviewRepo.addComment({ sessionId: reviewId, path: 'a.ts', lineStart: 1, lineEnd: 1, side: 'new', body: 'x', severity: 'minor', author: 'agent', parentId: null })
    const reviewWindow = desktops.state(desktopId).windows.find((w) => w.app === 'code-review')!
    desktops.closeWindow(reviewWindow.id)
    await Promise.resolve()
    expect(removed).toEqual([reviewId])
    expect(f.repos.sessions.get(reviewId)).toBeNull()
    expect(reviewRepo.listComments(reviewId)).toEqual([])
    const chatWindow = desktops.state(desktopId).windows.find((w) => w.app === 'chat')!
    desktops.closeWindow(chatWindow.id)
    await Promise.resolve()
    expect(removed).toEqual([reviewId])
    expect(f.repos.sessions.get(chatId)).not.toBeNull()
  })
})

describe('ReviewService comments', () => {
  it('rejects empty comments, paths outside the review, replies to other reviews, and non-review sessions', async () => {
    expect(() => reviews.addComment(reviewId, { path: 'a.ts', lineStart: 1, body: '  ' }, 'user')).toThrow(/needs text/)
    expect(() => reviews.addComment(reviewId, { path: '../secret', lineStart: 1, body: 'x' }, 'user')).toThrow(/Not a path inside/)
    expect(() => reviews.addComment(reviewId, { path: 'C:\\x', lineStart: 1, body: 'x' }, 'user')).toThrow(/Not a path inside/)
    expect(() => reviews.addComment(chatId, { path: 'a.ts', lineStart: 1, body: 'x' }, 'user')).toThrow(/not a review/)
    const other = f.repos.sessions.create({ agentId: f.agentId, desktopId, title: 'other', role: 'review' })
    const foreign = reviews.addComment(other.id, { path: 'a.ts', lineStart: 1, body: 'x' }, 'user')
    expect(() => reviews.addComment(reviewId, { path: 'a.ts', lineStart: 1, body: 'y', parentId: foreign.id }, 'user')).toThrow(/another review/)
  })

  it('a reply to a reply hangs under the thread root; state changes, markSent and delete publish review.changed', () => {
    const root = reviews.addComment(reviewId, { path: 'a.ts', lineStart: 2, lineEnd: 4, body: 'root', severity: 'major' }, 'agent')
    const reply = reviews.addComment(reviewId, { path: 'a.ts', lineStart: 2, body: 'r1', parentId: root.id }, 'user')
    const nested = reviews.addComment(reviewId, { path: 'a.ts', lineStart: 2, body: 'r2', parentId: reply.id }, 'user')
    expect(nested.parentId).toBe(root.id)
    expect(root).toMatchObject({ lineStart: 2, lineEnd: 4 })
    f.publisher.published.length = 0
    reviews.setState(root.id, 'resolved')
    reviews.markSent(reviewId, [root.id])
    reviews.remove(reply.id)
    expect(f.publisher.names().filter((n) => n === 'review.changed')).toHaveLength(3)
    expect(reviews.state(reviewId).comments.map((c) => [c.id, c.state])).toEqual([[root.id, 'sent'], [nested.id, 'open']])
  })
})
