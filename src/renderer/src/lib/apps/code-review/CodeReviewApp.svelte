<script lang="ts">
  /**
   * Code Review: a WinDiff-style diff of a working tree against a base ref (outline of the changed files, expanded
   * view with the coloured margin bar, side by side), with a dedicated ACP session beside it (the embedded chat
   * panel in role `review`) whose agent leaves inline comments like a merge request gets them. The comments can be
   * passed to a chat to fix. See docs/help/code-review.md.
   */
  import { onMount, tick, untrack } from 'svelte'
  import type { Agent7Events } from '@shared/ipc'
  import type { SessionAgentStore } from '../../agui/SessionAgentStore.svelte'
  import type { SessionDto } from '@shared/models'
  import {
    VERDICT_LABELS,
    isSafeRef,
    reviewKickoffPrompt,
    type NewReviewComment,
    type ReviewChangeDto,
    type ReviewCommentDto,
    type ReviewFileDto,
    type ReviewStateDto
  } from '@shared/review'
  import { stepRegion } from '@shared/windiff'
  import { connectionLabel } from '../../app/sessionStatus'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import Separator from '../../kit/atoms/Separator.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import type { MenuDef } from '../../kit/molecules/MenuItem'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { ViewSync } from '../viewSync'
  import { useSessionStores } from '../sessionStores.svelte'
  import EmbeddedChat from '../shared/EmbeddedChat.svelte'
  import type { AppProps } from '../types'
  import ReviewComments from './ReviewComments.svelte'
  import ReviewDiff from './ReviewDiff.svelte'
  import ReviewOutline from './ReviewOutline.svelte'
  import SendToChatDialog, { type SendTarget } from './SendToChatDialog.svelte'
  import { commentCounts, fileView, neighbourFile, openCounts, selectForSend, type ReviewLayout, type ReviewViewMode } from './reviewModel'

  let { window: win, host, focused = true }: AppProps<'code-review'> = $props()

  // svelte-ignore state_referenced_locally
  const stores = useSessionStores(host)
  const desktopId = $derived(host.state.desktopId)
  const sessionId = $derived(win.view.sessionId)
  const root = $derived(win.view.root)

  // ---- state ------------------------------------------------------------------------------------
  let baseRef = $state(win.view.baseRef)
  let baseDraft = $state(win.view.baseRef)
  let chosenPath = $state<string | null>(win.view.selectedPath)
  let changes = $state.raw<ReviewChangeDto[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)
  let file = $state.raw<ReviewFileDto | null>(null)
  let review = $state.raw<ReviewStateDto>({ comments: [], summary: null })
  let mode = $state<ReviewViewMode>('expanded')
  let layout = $state<ReviewLayout>(loadLayout())
  let selectedRow = $state<number | null>(null)
  let commentsOpen = $state(true)
  let selectedCommentId = $state<number | null>(null)
  let chatCollapsed = $state(false)
  let chatWidth = $state(340)
  let store = $state.raw<SessionAgentStore | null>(null)
  let session = $state.raw<SessionDto | null>(null)
  let sendDialog = $state.raw<{ ids: number[] | 'open'; count: number; chats: SessionDto[] } | null>(null)
  let sending = $state(false)
  let diff = $state<ReviewDiff | null>(null)
  let pendingStep: 'first' | 'last' | null = null

  function loadLayout(): ReviewLayout {
    try {
      return window.localStorage.getItem('agent7.review.layout') === 'split' ? 'split' : 'unified'
    } catch {
      return 'unified'
    }
  }
  function saveLayout(value: ReviewLayout): void {
    try {
      window.localStorage.setItem('agent7.review.layout', value)
    } catch {
      /* private window or blocked storage: the layout is only remembered for this window */
    }
  }

  const selectedPath = $derived(changes.some((c) => c.path === chosenPath) ? chosenPath : (changes[0]?.path ?? null))
  const fv = $derived(fileView(file, layout))
  const counts = $derived(commentCounts(review.comments))
  const opens = $derived(openCounts(review.comments))
  const reviewing = $derived(store?.running ?? false)
  const status = $derived(store?.state.session.status && store.state.session.status !== 'closed' ? store.state.session.status : (session?.status ?? null))

  // ---- view state: report ours, follow the agent's ------------------------------------------------
  const sync = new ViewSync<{ baseRef: string; selectedPath: string | null }>((v) => JSON.stringify([v.baseRef, v.selectedPath]))
  sync.mark({ baseRef, selectedPath: chosenPath })

  $effect(() => {
    const view = { baseRef, selectedPath }
    untrack(() => {
      if (sync.mark(view)) host.updateView(win.id, { app: 'code-review', root, sessionId, ...view })
    })
  })
  $effect(() => {
    const view = win.view
    if (!sync.isExternal({ baseRef: view.baseRef, selectedPath: view.selectedPath })) return
    untrack(() => {
      baseRef = view.baseRef
      baseDraft = view.baseRef
      chosenPath = view.selectedPath
    })
  })

  // ---- loading ----------------------------------------------------------------------------------
  const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)
  let changesToken = 0

  async function loadChanges(): Promise<void> {
    const token = ++changesToken
    try {
      const next = await host.api.review.changes(desktopId, root, baseRef)
      if (token !== changesToken) return
      if (!same(next, changes)) changes = next
      error = null
    } catch (e) {
      if (token !== changesToken) return
      error = e instanceof Error ? e.message : String(e)
      changes = []
    } finally {
      if (token === changesToken) loading = false
    }
  }

  $effect(() => {
    void root
    void baseRef
    void desktopId
    untrack(() => {
      loading = true
      void loadChanges()
    })
  })

  let fileToken = 0
  let fileKey = ''
  $effect(() => {
    const path = selectedPath
    const entry = changes.find((c) => c.path === path)
    if (!path || !entry) {
      file = null
      fileKey = ''
      return
    }
    const key = JSON.stringify([root, baseRef, entry])
    if (key === fileKey) return
    fileKey = key
    const token = ++fileToken
    untrack(() => {
      void host.api.review
        .file(desktopId, root, baseRef, path)
        .then((next) => {
          if (token !== fileToken) return
          if (!file || file.path !== next.path) selectedRow = null
          file = next
        })
        .catch((e) => {
          if (token === fileToken) error = e instanceof Error ? e.message : String(e)
        })
    })
  })

  async function loadReview(): Promise<void> {
    if (sessionId <= 0) return
    try {
      review = await host.api.review.state(sessionId)
    } catch {
      /* the session is gone (the window is closing) */
    }
  }

  onMount(() => {
    void loadReview()
    let timer: ReturnType<typeof setTimeout> | undefined
    const offGit = host.api.on('git.changed', (e: Agent7Events['git.changed']) => {
      if (e.desktopId !== desktopId) return
      clearTimeout(timer)
      timer = setTimeout(() => void loadChanges(), 200)
    })
    const offReview = host.api.on('review.changed', (e: Agent7Events['review.changed']) => {
      if (e.sessionId === sessionId) void loadReview()
    })
    return () => {
      clearTimeout(timer)
      offGit()
      offReview()
    }
  })

  // ---- the first prompt: the reviewer starts on its own when the window opens with an empty transcript ---------
  const kickedOff = new Set<number>()
  $effect(() => {
    const s = store
    const id = sessionId
    if (!s || !session || id <= 0 || kickedOff.has(id)) return
    kickedOff.add(id)
    untrack(() => void kickoff(s))
  })

  async function kickoff(s: SessionAgentStore): Promise<void> {
    await s.whenConnected()
    if (s.messages.length === 0 && !s.running) void s.send(reviewKickoffPrompt(root, baseRef))
  }

  // ---- navigation: F7 / Shift+F7 ----------------------------------------------------------------
  async function showRow(row: number): Promise<void> {
    selectedRow = row
    await tick()
    diff?.scrollToRow(row)
  }

  async function goToFile(path: string, step: 'first' | 'last' | null): Promise<void> {
    pendingStep = step
    chosenPath = path
    mode = 'expanded'
    if (step === null) selectedRow = null
  }

  $effect(() => {
    if (!pendingStep || !file || file.path !== selectedPath) return
    const regions = fv.regions
    const which = pendingStep
    pendingStep = null
    const region = which === 'first' ? regions[0] : regions.at(-1)
    if (region) untrack(() => void showRow(region.start))
  })

  function step(direction: 1 | -1): void {
    if (mode === 'outline') mode = 'expanded'
    const regions = fv.regions
    const next = stepRegion(regions, selectedRow, direction)
    const wrapped = next !== null && selectedRow !== null && (direction === 1 ? regions[next].start <= selectedRow : regions[next].start >= selectedRow)
    if (next === null || wrapped) {
      const neighbour = neighbourFile(changes, selectedPath, direction)
      if (neighbour && neighbour !== selectedPath) return void goToFile(neighbour, direction === 1 ? 'first' : 'last')
    }
    if (next !== null) void showRow(regions[next].start)
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!focused || event.key !== 'F7' || event.altKey || event.ctrlKey) return
    event.preventDefault()
    step(event.shiftKey ? -1 : 1)
  }

  function applyBase(): void {
    const next = baseDraft.trim() || 'HEAD'
    if (!isSafeRef(next)) {
      void showMessageBox({ text: `"${next}" is not a valid git ref. Use a branch, tag or commit such as HEAD, HEAD~1 or main.`, caption: 'Code Review', buttons: 'OK', icon: 'warning' })
      baseDraft = baseRef
      return
    }
    baseDraft = next
    if (next === baseRef) return void loadChanges()
    baseRef = next
    chosenPath = null
    selectedRow = null
  }

  // ---- comments ---------------------------------------------------------------------------------
  const errorBox = (e: unknown): Promise<unknown> =>
    showMessageBox({ text: e instanceof Error ? e.message : String(e), caption: 'Code Review', buttons: 'OK', icon: 'error' })

  async function run(action: () => Promise<unknown>): Promise<void> {
    try {
      await action()
      await loadReview()
    } catch (e) {
      await errorBox(e)
    }
  }

  const addComment = (input: { path: string; side: 'old' | 'new'; line: number; body: string; severity: NewReviewComment['severity'] }): Promise<void> =>
    run(() => host.api.review.addComment(sessionId, { path: input.path, side: input.side, lineStart: input.line, body: input.body, severity: input.severity }))

  const resolveComment = (c: ReviewCommentDto, resolved: boolean): Promise<void> => run(() => host.api.review.setState(c.id, resolved ? 'resolved' : 'open'))

  const replyTo = (root: ReviewCommentDto, body: string): Promise<void> =>
    run(() => host.api.review.addComment(sessionId, { path: root.path, side: root.side, lineStart: root.lineStart, lineEnd: root.lineEnd, body, parentId: root.id }))

  async function deleteComment(c: ReviewCommentDto): Promise<void> {
    const answer = await showMessageBox({ text: c.parentId === null ? 'Delete this comment and its replies?' : 'Delete this reply?', caption: 'Code Review', buttons: 'YesNo', icon: 'warning' })
    if (answer === 'yes') await run(() => host.api.review.remove(c.id))
  }

  async function showComment(c: ReviewCommentDto): Promise<void> {
    selectedCommentId = c.id
    mode = 'expanded'
    if (c.path !== selectedPath) {
      chosenPath = c.path
      await tick()
    }
    await tick()
    diff?.scrollToRow(Math.max(0, (layout === 'split' ? fv.split.findIndex((r) => (c.side === 'old' ? r.left?.oldNo === c.lineEnd : r.right?.newNo === c.lineEnd)) : fv.lines.findIndex((l) => (c.side === 'old' ? l.oldNo === c.lineEnd : l.newNo === c.lineEnd)))))
  }

  // ---- send to chat -----------------------------------------------------------------------------
  async function openSend(ids: number[] | 'open'): Promise<void> {
    const selection = selectForSend(review, ids, baseRef)
    if (selection.ids.length === 0) {
      await showMessageBox({ text: 'There are no open comments to send.', caption: 'Code Review', buttons: 'OK', icon: 'information' })
      return
    }
    try {
      const sessions = await host.api.sessions.list(desktopId)
      const chats = sessions.filter((s) => s.role === 'chat').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      sendDialog = { ids, count: ids === 'open' ? counts.open : ids.length, chats }
    } catch (e) {
      await errorBox(e)
    }
  }

  async function confirmSend(target: SendTarget): Promise<void> {
    if (!sendDialog || sending) return
    const { ids } = sendDialog
    sending = true
    try {
      let chatId: number
      if (target.kind === 'new') {
        const opened = await host.api.desktop.newChat(desktopId, undefined, root)
        chatId = opened.view.app === 'chat' ? opened.view.sessionId : 0
      } else chatId = target.sessionId
      if (chatId <= 0) throw new Error('The chat could not be started.')
      const chat = stores.open(chatId) as SessionAgentStore
      await (chat.whenConnected?.() ?? Promise.resolve())
      if (chat.running || chat.interrupts.length > 0) throw new Error('That chat is busy. Wait for it to finish its turn, or pick another chat.')
      const selection = selectForSend(review, ids, baseRef)
      if (selection.ids.length === 0) throw new Error('There are no open comments to send.')
      void chat.send(selection.text)
      await host.api.review.markSent(sessionId, selection.ids)
      sendDialog = null
      await loadReview()
      await host.openApp({ app: 'chat', sessionId: chatId }) // focuses its window
    } catch (e) {
      await errorBox(e)
    } finally {
      sending = false
    }
  }

  // ---- chrome -----------------------------------------------------------------------------------
  const menus = $derived<MenuDef[]>([
    {
      label: '&Review',
      items: [
        { id: 'review-send-all', testid: 'review-menu-send-all', label: 'Send all open comments to &chat...', disabled: counts.open === 0, action: () => void openSend('open') },
        { id: 'review-refresh', testid: 'review-menu-refresh', label: '&Refresh', shortcut: 'F5', action: () => void loadChanges() },
        { separator: true },
        { id: 'review-close', testid: 'review-menu-close', label: '&Close', action: () => void host.closeWindow(win.id) }
      ]
    },
    {
      label: '&View',
      items: [
        { id: 'view-outline', testid: 'review-menu-outline', label: '&Outline', radio: true, checked: mode === 'outline', action: () => (mode = 'outline') },
        { id: 'view-expanded', testid: 'review-menu-expanded', label: '&Expanded', radio: true, checked: mode === 'expanded', action: () => (mode = 'expanded') },
        { separator: true },
        { id: 'view-split', testid: 'review-menu-split', label: '&Side by side', checked: layout === 'split', action: () => toggleLayout() },
        { id: 'view-comments', testid: 'review-menu-comments', label: '&Comments list', checked: commentsOpen, action: () => (commentsOpen = !commentsOpen) },
        { separator: true },
        { id: 'view-next', testid: 'review-menu-next', label: '&Next change', shortcut: 'F7', action: () => step(1) },
        { id: 'view-prev', testid: 'review-menu-prev', label: '&Previous change', shortcut: 'Shift+F7', action: () => step(-1) }
      ]
    },
    { label: '&Help', items: [{ id: 'review-help', testid: 'review-menu-help', label: '&Help on Code Review', shortcut: 'F1', action: () => void host.openApp({ app: 'help', topic: 'code-review' }) }] }
  ])

  function toggleLayout(): void {
    layout = layout === 'split' ? 'unified' : 'split'
    saveLayout(layout)
    selectedRow = null
  }

  const contextOf = (): Record<string, unknown> => ({
    app: 'code-review',
    root,
    baseRef,
    selectedPath,
    selectedRow: selectedRow === null ? null : (fv.lines[selectedRow] ?? null),
    openComments: counts.open
  })

  const fileItems = $derived(changes.map((c) => ({ value: c.path, label: c.path })))
</script>

<svelte:window onkeydown={onKeydown} />

<div class="review" data-testid="code-review-app" data-session-id={sessionId} data-mode={mode} data-layout={layout}>
  <MenuStrip {menus} aria-label="Code Review menu" />
  <div class="bar">
    <ToolStripButton icon="file" text="Outline" checked={mode === 'outline'} onclick={() => (mode = 'outline')} data-testid="review-view-outline" />
    <ToolStripButton icon="file-code" text="Expanded" checked={mode === 'expanded'} onclick={() => (mode = 'expanded')} data-testid="review-view-expanded" />
    <Separator orientation="vertical" />
    <ToolStripButton icon="changes" text="Side by side" checked={layout === 'split'} onclick={toggleLayout} data-testid="review-split-toggle" />
    <Separator orientation="vertical" />
    <ToolStripButton icon="chevron-up" text="Previous" onclick={() => step(-1)} disabled={changes.length === 0} data-testid="review-prev-change" title="Previous change (Shift+F7)" />
    <ToolStripButton icon="chevron-down" text="Next" onclick={() => step(1)} disabled={changes.length === 0} data-testid="review-next-change" title="Next change (F7)" />
    <Separator orientation="vertical" />
    <span>Against:</span>
    <TextBox
      bind:value={baseDraft}
      aria-label="Base ref"
      data-testid="review-base-ref"
      style="width:110px"
      onkeydown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          applyBase()
        }
      }}
      onblur={applyBase}
    />
    <ToolStripButton icon="refresh" onclick={() => void loadChanges()} data-testid="review-refresh" title="Refresh" />
    {#if mode === 'expanded'}
      <Separator orientation="vertical" />
      <ComboBox aria-label="File" testid="review-file-select" items={fileItems} value={selectedPath ?? ''} onchange={(path) => void goToFile(path, null)} disabled={changes.length === 0} style="width:230px" />
    {/if}
    <span class="spring"></span>
    <ToolStripButton icon="properties" text="Comments ({counts.open})" checked={commentsOpen} onclick={() => (commentsOpen = !commentsOpen)} data-testid="review-comments-toggle" />
  </div>

  {#if review.summary}
    <div class="banner {review.summary.verdict}" data-testid="review-verdict" data-verdict={review.summary.verdict} role="status">
      <b>{VERDICT_LABELS[review.summary.verdict]}</b>
      {#if review.summary.body}<span class="body">{review.summary.body}</span>{/if}
    </div>
  {:else}
    <div class="banner pending" data-testid="review-banner" data-state={reviewing ? 'reviewing' : 'waiting'} role="status">
      {reviewing ? 'The reviewer is reading the changes...' : 'No verdict yet. Ask the reviewer in the chat panel, or click a line number to comment yourself.'}
    </div>
  {/if}

  <div class="row">
    <div class="main">
      {#if error}
        <div class="note" data-testid="review-error">{error}</div>
      {:else if mode === 'outline' || !file}
        <ReviewOutline
          {changes}
          {selectedPath}
          openComments={opens}
          {loading}
          onselect={(path) => (chosenPath = path)}
          onopen={(path) => void goToFile(path, null)}
        />
      {:else}
        <div class="file-head" data-testid="review-file-head">
          <b>{file.path}</b>
          {#if file.oldPath}<span class="was">(was {file.oldPath})</span>{/if}
          <span class="spring"></span>
          <span class="stat">{fv.regions.length} {fv.regions.length === 1 ? 'change' : 'changes'}</span>
        </div>
        <ReviewDiff
          bind:this={diff}
          {file}
          view={fv}
          {layout}
          comments={review.comments}
          {selectedRow}
          onselectrow={(row) => (selectedRow = row)}
          oncomment={(input) => void addComment(input)}
          onresolve={(c, resolved) => void resolveComment(c, resolved)}
          onreply={(r, body) => void replyTo(r, body)}
          ondelete={(c) => void deleteComment(c)}
          onsend={(c) => void openSend([c.id])}
        />
      {/if}
    </div>
    {#if commentsOpen}
      <ReviewComments comments={review.comments} selectedId={selectedCommentId} onselect={(c) => void showComment(c)} onsendall={() => void openSend('open')} />
    {/if}
    <EmbeddedChat
      {host}
      {sessionId}
      role="review"
      collapsible
      resizable
      contained
      bind:collapsed={chatCollapsed}
      bind:width={chatWidth}
      bind:store
      bind:session
      title="Reviewer"
      contextProvider={contextOf}
      openFilePath={selectedPath}
    />
  </div>

  <StatusStrip sizeGrip={false}>
    <StatusStripLabel testid="review-status-root" text="{root} against {baseRef}" spring />
    <StatusStripLabel testid="review-status-files" text="{changes.length} {changes.length === 1 ? 'file' : 'files'}" borders={['left']} />
    <StatusStripLabel testid="review-status-comments" text="{counts.open} open, {counts.resolved} resolved, {counts.sent} sent" borders={['left']} />
    <StatusStripLabel testid="review-status-agent" text={connectionLabel(status)} borders={['left']} />
  </StatusStrip>

  {#if sendDialog}
    <SendToChatDialog chats={sendDialog.chats} count={sendDialog.count} cwd={root} busy={sending} onsend={(target) => void confirmSend(target)} oncancel={() => (sendDialog = null)} />
  {/if}
</div>

<style>
  .review {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
  }
  .bar {
    flex: none;
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 30px;
    padding: 0 6px;
    background: linear-gradient(#fafcfe, #dce6f4);
    border-bottom: 1px solid #aab7cb;
  }
  .spring {
    flex: 1;
  }
  .banner {
    flex: none;
    display: flex;
    gap: 8px;
    padding: 4px 10px;
    border-bottom: 1px solid var(--w7-panel-border);
    background: #eef2f8;
    color: var(--w7-text);
  }
  .banner.approve {
    background: #e3f4dc;
  }
  .banner.request_changes {
    background: #fde6e2;
  }
  .banner.comment {
    background: #fff6d6;
  }
  .banner.pending {
    color: var(--w7-text-muted);
  }
  .banner .body {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 4px;
    padding: 4px;
  }
  .main {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .file-head {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 8px;
    background: linear-gradient(#f9fbfd, #e4ecf6);
    border: 1px solid var(--w7-panel-border);
    border-bottom: 0;
  }
  .was,
  .stat {
    color: var(--w7-text-muted);
  }
  .note {
    padding: 10px;
    color: var(--w7-text-muted);
    background: var(--w7-window);
    border: 1px solid var(--w7-panel-border);
  }
</style>
