<script lang="ts">
  /**
   * Code Review: a WinDiff-style diff of a working tree against a base ref (outline of the changed files, expanded
   * view with the coloured margin bar, side by side, or every file in one page), with a dedicated ACP session beside
   * it (the embedded chat panel in role `review`) whose agent leaves inline comments like a merge request gets them.
   * Opening the window is read only: no agent starts reviewing until the user clicks "Ask the agent to review...".
   * The comments can be passed to a chat to fix. See manuals/code-review.md.
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
  import Splitter from '../../kit/atoms/Splitter.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import type { MenuDef } from '../../kit/molecules/MenuItem'
  import { closeItems, menuBar } from '../../kit/molecules/standardMenu'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { ViewSync } from '../viewSync'
  import { useSessionStores } from '../sessionStores.svelte'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import EmbeddedChat from '../shared/EmbeddedChat.svelte'
  import type { AppProps } from '../types'
  import ReviewComments from './ReviewComments.svelte'
  import ReviewDiff from './ReviewDiff.svelte'
  import ReviewOutline from './ReviewOutline.svelte'
  import SendToChatDialog, { type SendTarget } from './SendToChatDialog.svelte'
  import {
    HEAD_MEANING,
    STATUS_LABEL,
    baseLabel,
    changePositionLabel,
    changeTotals,
    commentCounts,
    fileView,
    neighbourFile,
    openCounts,
    openingFile,
    selectForSend,
    type ReviewLayout,
    type ReviewViewMode
  } from './reviewModel'

  let { window: win, host, focused = true }: AppProps<'code-review'> = $props()

  // svelte-ignore state_referenced_locally
  const stores = useSessionStores(host)
  const desktopId = $derived(host.state.desktopId)
  const sessionId = $derived(win.view.sessionId)
  const root = $derived(win.view.root)

  // ---- state ------------------------------------------------------------------------------------
  // svelte-ignore state_referenced_locally
  let baseRef = $state(win.view.baseRef)
  // svelte-ignore state_referenced_locally
  let baseDraft = $state(win.view.baseRef)
  // svelte-ignore state_referenced_locally
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
  let commentsWidth = $state(260)
  const COMMENTS_MIN = 180
  const COMMENTS_MAX = 480
  // A narrow window (tiled beside another one) starts with the comments list and the reviewer chat closed, so the diff has room.
  let clientWidth = $state(0)
  let sized = false
  $effect(() => {
    if (sized || clientWidth === 0) return
    sized = true
    if (clientWidth < 960) commentsOpen = false
    if (clientWidth < 760) chatCollapsed = true
  })
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

  // The window opens on the first file that has a comment (else the first file).
  const selectedPath = $derived(changes.some((c) => c.path === chosenPath) ? chosenPath : openingFile(changes, review.comments))
  const fv = $derived(fileView(file, layout))
  const positionLabel = $derived(changePositionLabel(fv.regions, selectedRow))
  const counts = $derived(commentCounts(review.comments))
  const opens = $derived(openCounts(review.comments))
  const reviewing = $derived(store?.running ?? false)
  const status = $derived(store?.state.session.status && store.state.session.status !== 'closed' ? store.state.session.status : (session?.status ?? null))

  // ---- view state: report ours, follow the agent's ------------------------------------------------
  const sync = new ViewSync<{ baseRef: string; selectedPath: string | null }>((v) => JSON.stringify([v.baseRef, v.selectedPath]))
  // svelte-ignore state_referenced_locally
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

  // ---- ask the agent to review ------------------------------------------------------------------
  // Opening a review starts nothing: the reviewer reads and comments only when the user asks (UX-37).
  const ASK_HINT = 'The agent will read the changes and add comments. It cannot change files.'

  async function askAgent(): Promise<void> {
    const s = store
    if (!s || s.running) return
    await s.whenConnected()
    if (!s.running) void s.send(reviewKickoffPrompt(root, baseRef))
  }

  // ---- navigation: F7 / Shift+F7 ----------------------------------------------------------------
  async function showRow(row: number): Promise<void> {
    selectedRow = row
    await tick()
    diff?.scrollToRow(row)
  }

  // ---- All changes: every file's diff in one scroll ---------------------------------------------------
  let allFiles = $state.raw<Record<string, ReviewFileDto>>({})
  let allToken = 0
  let allScroller = $state<HTMLElement | null>(null)

  async function loadAll(list: readonly ReviewChangeDto[], base: string, token: number): Promise<void> {
    const next: Record<string, ReviewFileDto> = {}
    for (const change of list) {
      if (token !== allToken) return
      try {
        next[change.path] = await host.api.review.file(desktopId, root, base, change.path)
        allFiles = { ...next }
      } catch {
        /* the file vanished since the list was read: its section stays "Loading" until the next refresh */
      }
    }
  }

  $effect(() => {
    if (mode !== 'all') return
    const list = changes
    const base = baseRef
    const token = ++allToken
    untrack(() => void loadAll(list, base, token))
  })

  /** "Next file" and "Previous file" of the All changes page: scrolls to the section after (before) the one on top. */
  function scrollAll(direction: 1 | -1): void {
    if (!allScroller || changes.length === 0) return
    const sections = [...allScroller.querySelectorAll<HTMLElement>('[data-testid="review-all-file"]')]
    const top = allScroller.getBoundingClientRect().top
    const current = Math.max(0, sections.findLastIndex((el) => el.getBoundingClientRect().top - top <= 4))
    const next = sections[Math.max(0, Math.min(sections.length - 1, current + direction))]
    next?.scrollIntoView({ block: 'start' })
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
    if (mode === 'all') return scrollAll(direction)
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

  const diffHandlers = {
    oncomment: (input: { path: string; side: 'old' | 'new'; line: number; body: string; severity: NewReviewComment['severity'] }) => void addComment(input),
    onresolve: (c: ReviewCommentDto, resolved: boolean) => void resolveComment(c, resolved),
    onreply: (r: ReviewCommentDto, body: string) => void replyTo(r, body),
    ondelete: (c: ReviewCommentDto) => void deleteComment(c),
    onsend: (c: ReviewCommentDto) => void openSend([c.id])
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
  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'code-review')

  const menus = $derived<MenuDef[]>(
    menuBar([
    {
      label: '&File',
      items: [
        { id: 'review-refresh', testid: 'review-menu-refresh', label: '&Refresh', shortcut: 'F5', action: () => void loadChanges() },
        { id: 'review-send-all', testid: 'review-menu-send-all', label: 'Send all open comments to &chat...', disabled: counts.open === 0, action: () => void openSend('open') },
        { id: 'review-ask', testid: 'review-menu-ask-agent', label: '&Ask the agent to review...', disabled: !store || reviewing, action: () => void askAgent() },
        ...closeItems('code-review', () => void host.closeWindow(win.id))
      ]
    },
    {
      label: '&View',
      items: [
        { id: 'view-outline', testid: 'review-menu-outline', label: '&Outline', radio: true, checked: mode === 'outline', action: () => (mode = 'outline') },
        { id: 'view-expanded', testid: 'review-menu-expanded', label: '&Expanded', radio: true, checked: mode === 'expanded', action: () => (mode = 'expanded') },
        { id: 'view-all', testid: 'review-menu-all', label: 'All &changes', radio: true, checked: mode === 'all', action: () => (mode = 'all') },
        { separator: true },
        { id: 'view-split', testid: 'review-menu-split', label: '&Side by side', checked: layout === 'split', action: () => toggleLayout() },
        { id: 'view-comments', testid: 'review-menu-comments', label: 'Comments &list', checked: commentsOpen, action: () => (commentsOpen = !commentsOpen) },
        { separator: true },
        { id: 'view-next', testid: 'review-menu-next', label: '&Next change', shortcut: 'F7', action: () => step(1) },
        { id: 'view-prev', testid: 'review-menu-prev', label: '&Previous change', shortcut: 'Shift+F7', action: () => step(-1) }
      ]
    },
    help.menu()
    ])
  )

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

<div class="review" bind:clientWidth data-testid="code-review-app" data-session-id={sessionId} data-mode={mode} data-layout={layout}>
  <MenuStrip {menus} aria-label="Code Review menu" />
  <div class="bar" role="toolbar" aria-label="Code Review toolbar">
    <ToolStripButton icon="file" text="Outline" checked={mode === 'outline'} onclick={() => (mode = 'outline')} data-testid="review-view-outline" title="List the changed files" />
    <ToolStripButton icon="file-code" text="Expanded" checked={mode === 'expanded'} onclick={() => (mode = 'expanded')} data-testid="review-view-expanded" title="Show one file with all its lines" />
    <ToolStripButton icon="tasks" text="All changes" checked={mode === 'all'} onclick={() => (mode = 'all')} data-testid="review-view-all" title="Show every changed file in one page" />
    <Separator orientation="vertical" />
    <ToolStripButton icon="changes" text="Side by side" checked={layout === 'split'} onclick={toggleLayout} data-testid="review-split-toggle" title="Show the old and the new text in two columns" />
    <Separator orientation="vertical" />
    <ToolStripButton icon="chevron-up" text="Previous" onclick={() => step(-1)} disabled={changes.length === 0} data-testid="review-prev-change" title="Previous change (Shift+F7)" />
    <ToolStripButton icon="chevron-down" text="Next" onclick={() => step(1)} disabled={changes.length === 0} data-testid="review-next-change" title="Next change (F7)" />
    {#if mode === 'all'}
      <ToolStripButton icon="chevron-down" text="Next file" onclick={() => scrollAll(1)} disabled={changes.length === 0} data-testid="review-next-file" title="Go to the next file" />
    {/if}
    <Separator orientation="vertical" />
    <span class="against">
      <label for="review-base">Against:</label>
      <TextBox
        id="review-base"
        bind:value={baseDraft}
        aria-label="Compare with"
        title="HEAD is the last saved version (the last commit). Type a branch or a commit name to compare with another version."
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
      {#if baseRef === 'HEAD'}<span class="hint" data-testid="review-base-hint">({HEAD_MEANING})</span>{/if}
    </span>
    <ToolStripButton icon="refresh" onclick={() => void loadChanges()} data-testid="review-refresh" title="Read the changes again (F5)" />
    {#if mode === 'expanded'}
      <Separator orientation="vertical" />
      <ComboBox aria-label="File" testid="review-file-select" items={fileItems} value={selectedPath ?? ''} onchange={(path) => void goToFile(path, null)} disabled={changes.length === 0} style="width:230px" />
    {/if}
    <span class="spring"></span>
    <ToolStripButton icon="agent" text="Ask the agent to review..." onclick={() => void askAgent()} disabled={!store || reviewing} data-testid="review-ask-agent" title={ASK_HINT} />
    <ToolStripButton icon="properties" text="Comments ({counts.open})" checked={commentsOpen} onclick={() => (commentsOpen = !commentsOpen)} data-testid="review-comments-toggle" title="Show or hide the list of comments" />
  </div>

  {#if review.summary}
    <div class="banner {review.summary.verdict}" data-testid="review-verdict" data-verdict={review.summary.verdict} role="status">
      <b>{VERDICT_LABELS[review.summary.verdict]}</b>
      {#if review.summary.body}<span class="body">{review.summary.body}</span>{/if}
      {@render commentsLink()}
    </div>
  {:else}
    <div class="banner pending" data-testid="review-banner" data-state={reviewing ? 'reviewing' : 'waiting'} role="status">
      <span class="body">
        {reviewing
          ? 'The agent is reading the changes. It cannot change files.'
          : 'Nobody has reviewed these changes yet. Click a line number to comment yourself, or click "Ask the agent to review...".'}
      </span>
      {@render commentsLink()}
    </div>
  {/if}

  <div class="row">
    <div class="main">
      {#if error}
        <div class="note" data-testid="review-error">{error}</div>
      {:else if mode === 'all'}
        <div class="file-head" data-testid="review-all-head">
          <b>{changeTotals(changes)}</b>
          <span class="spring"></span>
          <span class="stat">Use Next file or F7 to go from file to file.</span>
        </div>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="all w7-scroll" bind:this={allScroller} role="region" tabindex="0" aria-label="All changes" data-testid="review-all">
          {#each changes as change (change.path)}
            {@const loaded = allFiles[change.path]}
            <section class="one" data-testid="review-all-file" data-path={change.path}>
              <div class="file-head">
                <b>{change.path}</b>
                {#if change.oldPath}<span class="was">(was {change.oldPath})</span>{/if}
                <span class="spring"></span>
                <span class="stat">{STATUS_LABEL[change.status]}, +{change.additions} -{change.deletions}</span>
              </div>
              {#if loaded}
                <ReviewDiff flow file={loaded} view={fileView(loaded, layout)} {layout} comments={review.comments} {...diffHandlers} />
              {:else}
                <div class="note">Loading...</div>
              {/if}
            </section>
          {:else}
            <div class="note" data-testid="review-outline-empty">{loading ? 'Looking for changes...' : 'No changes against the base. Nothing to review.'}</div>
          {/each}
        </div>
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
        <ReviewDiff bind:this={diff} {file} view={fv} {layout} comments={review.comments} {selectedRow} onselectrow={(row) => (selectedRow = row)} {...diffHandlers} />
      {/if}
    </div>
    {#if commentsOpen}
      <Splitter
        orientation="vertical"
        value={commentsWidth}
        min={COMMENTS_MIN}
        max={COMMENTS_MAX}
        label="Resize the comments list"
        step={20}
        onresize={(d) => (commentsWidth = Math.max(COMMENTS_MIN, Math.min(COMMENTS_MAX, commentsWidth - d)))}
      />
      <div class="comments" style="width:{commentsWidth}px" data-testid="review-comments-wrap">
        <ReviewComments comments={review.comments} selectedId={selectedCommentId} onselect={(c) => void showComment(c)} onsendall={() => void openSend('open')} />
      </div>
    {/if}
    <!-- The reviewer panel is clipped to the window: it never grows past 38 percent of it. -->
    <div class="reviewer" data-testid="review-reviewer-wrap">
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
  </div>

  <StatusStrip sizeGrip={false}>
    <StatusStripLabel testid="review-status-root" text="{root} against {baseLabel(baseRef)}" spring />
    <StatusStripLabel testid="review-status-files" text="{changes.length} {changes.length === 1 ? 'file' : 'files'}" borders={['left']} />
    {#if mode === 'expanded' && positionLabel}
      <StatusStripLabel testid="review-status-change" text={positionLabel} borders={['left']} />
    {/if}
    <StatusStripLabel testid="review-status-comments" text="{counts.open} open, {counts.resolved} resolved, {counts.sent} sent" borders={['left']} />
    <StatusStripLabel testid="review-status-agent" text={connectionLabel(status)} borders={['left']} />
  </StatusStrip>

  <AppAbout {help} />

  {#if sendDialog}
    <SendToChatDialog chats={sendDialog.chats} count={sendDialog.count} cwd={root} busy={sending} onsend={(target) => void confirmSend(target)} oncancel={() => (sendDialog = null)} />
  {/if}
</div>

{#snippet commentsLink()}
  {#if counts.total > 0}
    <button type="button" class="link" data-testid="review-banner-comments" onclick={() => (commentsOpen = true)}>
      {counts.total} {counts.total === 1 ? 'comment' : 'comments'}
    </button>
  {/if}
{/snippet}

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
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 4px;
    min-height: 30px;
    padding: 1px 6px;
    background: linear-gradient(#fafcfe, #dce6f4);
    border-bottom: 1px solid #aab7cb;
  }
  .spring {
    flex: 1;
  }
  .against {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex: none;
  }
  .hint {
    color: var(--w7-text-muted);
    white-space: nowrap;
  }
  .link {
    flex: none;
    margin-left: auto;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--w7-link);
    font: inherit;
    text-decoration: underline;
    cursor: default;
  }
  .comments {
    flex: none;
    min-width: 0;
    min-height: 0;
    display: flex;
  }
  .comments :global(.panel) {
    width: 100%;
  }
  /* The reviewer panel is clipped inside the client area. */
  .reviewer {
    flex: none;
    min-width: 0;
    max-width: 38%;
    min-height: 0;
    display: flex;
    overflow: hidden;
  }
  .all {
    flex: 1;
    min-height: 0;
    overflow: auto;
    background: var(--w7-window);
    border: 1px solid var(--w7-panel-border);
  }
  .one {
    margin-bottom: 8px;
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
    flex: 1;
    min-width: 0;
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
