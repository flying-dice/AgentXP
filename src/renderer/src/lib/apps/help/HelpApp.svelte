<script lang="ts">
  /** Help and Support: the manuals of manuals, a topic list, an article, Back, Forward, Home and a search box. */
  import { tick, untrack } from 'svelte'
  import type { AppProps } from '../types'
  import Icon from '../../kit/atoms/Icon.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import type { MenuDef, MenuItemDef } from '../../kit/molecules/MenuItem'
  import { closeItems, editItems, menuBar } from '../../kit/molecules/standardMenu'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import { useAppContext } from '../shared/appContext.svelte'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import { ViewSync } from '../viewSync'
  import { CONTROL_PREFIX, HOME_TOPIC, back, forward, markWords, queryWords, resolveSection, searchSections, sectionOfHref, splitTopic, startHistory, topicOfHref, visit, type HelpTopic } from './helpModel'
  import { escapeHtml, renderHelpMarkdown } from './helpMarkdown'
  import { helpTopics } from './helpTopics'
  import { collapseContents, scrollTopFor, tailPadding } from './contents'

  let { window: win, host, focused = false }: AppProps<'help'> = $props()
  const topics: HelpTopic[] = helpTopics

  // svelte-ignore state_referenced_locally
  const opening = splitTopic(win.view.topic || HOME_TOPIC)
  /** The topic of the app that was focused when Help opened: a search lists it first (UX-81). */
  let preferred = $state(opening.topic)
  let history = $state.raw(startHistory(opening.topic))
  let query = $state('')
  let article = $state<HTMLElement | null>(null)
  /** The Contents list (the topics) is shown; Contents in the toolbar hides it to give the article room. */
  let contentsOpen = $state(true)
  /** The section a search hit opened (its heading id), scrolled to when the article shows. */
  // svelte-ignore state_referenced_locally
  let pendingSection = $state<string | null>(opening.section || null)
  let searchBox = $state<HTMLInputElement | HTMLTextAreaElement | null>(null)
  let flashTimer: ReturnType<typeof setTimeout> | undefined
  let settle: ResizeObserver | undefined
  let settleTimer: ReturnType<typeof setTimeout> | undefined
  /** How long after a jump the target is kept in place while the window is laid out (milliseconds). */
  const SETTLE_MS = 1000
  /** The heading the last jump went to: the right half of the status bar names it (the left half names the topic). */
  let sectionName = $state('')

  const sync = new ViewSync<{ topic: string }>((v) => v.topic)
  const topic = $derived(history.current)
  const current = $derived(topics.find((t) => t.id === topic) ?? null)
  const hits = $derived(searchSections(topics, query, preferred))
  const words = $derived(queryWords(query))
  const searching = $derived(query.trim() !== '')
  const html = $derived(current ? (searching ? markWords(renderHelpMarkdown(current.body), words) : renderHelpMarkdown(current.body)) : '')

  /** Shows a topic, at a section when one is named. The topic on screen scrolls at once (nothing re-renders for it). */
  function show(next: string, sectionId: string | null = null): void {
    const { topic: name, section } = splitTopic(next)
    const wanted = sectionId || section || null
    if (name === history.current) {
      if (wanted) void tick().then(() => goToSection(wanted))
      return
    }
    pendingSection = wanted
    history = visit(history, name)
  }

  /** The heading of the chapter or section that a table row sits under: the nearest heading before its table. */
  function headingOf(row: HTMLElement): HTMLElement | null {
    let node: Element | null = row.closest('table')
    while (node) {
      node = node.previousElementSibling
      if (node && /^H[1-4]$/.test(node.tagName) && node.id) return node as HTMLElement
    }
    return null
  }

  /** The table row of a control (F1 on it): the row of the manual's Controls Reference that has its name in the first column. */
  function controlRow(name: string): HTMLElement | null {
    const cell = [...(article?.querySelectorAll('td:first-child') ?? [])].find((c) => c.textContent?.trim() === name)
    return cell?.closest('tr') ?? null
  }

  /** Scrolls to a heading (or the table row of a control) of the article and marks it; the matched line under it is highlighted for 2 seconds. */
  function goToSection(wanted: string): void {
    if (!article) return
    for (const old of article.querySelectorAll('.target, .flash')) {
      old.classList.remove('target', 'flash')
      old.removeAttribute('data-testid')
    }
    const row = wanted.startsWith(CONTROL_PREFIX) ? controlRow(wanted.slice(CONTROL_PREFIX.length)) : null
    const ids = [...article.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id]')].map((h) => h.id)
    const parent = row ? headingOf(row) : null
    const id = row ? (parent?.id ?? null) : resolveSection(ids, wanted)
    const heading = row ?? (id ? article.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`) : null)
    if (!heading) return
    heading.classList.add('target')
    heading.setAttribute('data-testid', 'help-target')
    // The contents shrink to this chapter first, so the heading lands where it will stay; then it goes 24 px below the top (UX-132, UX-205).
    collapseContents(article, id)
    scrollToTarget(heading)
    keepInPlace(heading)
    sectionName = (row ? (parent?.textContent ?? '') : heading.textContent)?.trim() ?? ''
    flashMatch(heading)
  }

  /** Scrolls the article so that `heading` has 24 px above it. A heading near the end of a long topic gets room under the text first, so it can reach the top. */
  function scrollToTarget(heading: HTMLElement): void {
    if (!article) return
    const top = heading.getBoundingClientRect().top - article.getBoundingClientRect().top + article.scrollTop
    const tail = article.querySelector<HTMLElement>('.xp-help-md')
    if (tail) {
      const own = parseFloat(tail.style.paddingBottom) || 0
      tail.style.paddingBottom = `${tailPadding(top, article.scrollHeight, article.clientHeight, own)}px`
    }
    article.scrollTop = scrollTopFor(top)
  }

  /**
   * The Help window is placed and sized just after it opens, and the text reflows when its width changes. For a moment after a jump the
   * article keeps the target where the jump put it (UX-205), so a heading is not left half cut by a reflow.
   */
  function keepInPlace(heading: HTMLElement): void {
    settle?.disconnect()
    clearTimeout(settleTimer)
    if (!article || typeof ResizeObserver === 'undefined') return
    settle = new ResizeObserver(() => heading.isConnected && scrollToTarget(heading))
    settle.observe(article)
    settleTimer = setTimeout(() => settle?.disconnect(), SETTLE_MS)
  }

  /** The first marked word after the heading: its paragraph, item or cell flashes. */
  function flashMatch(heading: HTMLElement): void {
    if (!searching || !article) return
    const mark = [...article.querySelectorAll('mark')].find((m) => heading.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING)
    const line = mark?.closest('p, li, td, th, blockquote, pre') ?? null
    if (!line) return
    line.classList.add('flash')
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => line.classList.remove('flash'), 2000)
  }

  // Report the topic (the shell stores it) and follow a topic that arrives from outside (F1 on another window).
  $effect(() => {
    const view = { topic }
    if (sync.mark(view)) untrack(() => host.updateView(win.id, { app: 'help', topic }))
  })
  $effect(() => {
    const incoming = win.view.topic
    if (!incoming || !sync.isExternal({ topic: incoming })) return
    untrack(() => {
      preferred = splitTopic(incoming).topic
      show(incoming)
    })
  })

  // The window takes the keyboard focus (the search box) when it opens and whenever it comes to the front (UX-80).
  $effect(() => {
    if (focused && searchBox && !untrack(() => ctx.open)) searchBox.focus()
  })
  $effect(() => () => {
    clearTimeout(flashTimer)
    clearTimeout(settleTimer)
    settle?.disconnect()
  })
  // A new article starts at the top, or at the section and the first marked word of a search hit.
  $effect(() => {
    void html
    const section = untrack(() => pendingSection)
    void tick().then(() => {
      if (!article) return
      article.scrollTop = 0
      sectionName = ''
      collapseContents(article, null)
      if (section) goToSection(section)
      const mark = searching ? article.querySelector('mark') : null
      if (mark && !section) mark.scrollIntoView({ block: 'center' })
      pendingSection = null
    })
  })

  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'help')
  const ctx = new ContextMenu()
  const copy = (): void => void document.execCommand('copy')
  const selectAll = (): void => void (article && window.getSelection()?.selectAllChildren(article))
  const selected = (): boolean => !!window.getSelection() && !window.getSelection()!.isCollapsed && !!article?.contains(window.getSelection()!.anchorNode)

  /** Copy, Select All and the toolbar's Back, Forward and Home. */
  const contextItems = (): MenuItemDef[] => [
    ...editItems('help-ctx', { copy, selectAll }, { hasSelection: selected() }),
    { separator: true },
    { id: 'help-ctx-back', testid: 'help-ctx-back', label: '&Back', icon: 'chevron-left', disabled: history.past.length === 0, action: () => (history = back(history)) },
    { id: 'help-ctx-forward', testid: 'help-ctx-forward', label: '&Forward', icon: 'chevron-right', disabled: history.future.length === 0, action: () => (history = forward(history)) },
    { id: 'help-ctx-home', testid: 'help-ctx-home', label: '&Home', icon: 'help', action: () => show(HOME_TOPIC) }
  ]

  // The chat pane knows the topic on screen.
  // svelte-ignore state_referenced_locally
  useAppContext(host, () => win.id, () => ({ topic, topicTitle: current?.title ?? null }))

  const menus = $derived<MenuDef[]>(
    menuBar([
      { label: '&File', items: closeItems('help', () => void host.closeWindow(win.id)).slice(1) },
      { label: '&Edit', items: editItems('help-menu', { copy, selectAll }, { hasSelection: true }) },
      {
        label: '&View',
        items: [
          { id: 'back', testid: 'help-menu-back', label: '&Back', shortcut: 'Alt+Left', disabled: history.past.length === 0, action: () => (history = back(history)) },
          { id: 'forward', testid: 'help-menu-forward', label: '&Forward', shortcut: 'Alt+Right', disabled: history.future.length === 0, action: () => (history = forward(history)) },
          { id: 'home', testid: 'help-menu-home', label: '&Home', action: () => show(HOME_TOPIC) },
          { separator: true },
          help.paneItem(win.id)
        ]
      },
      help.menu()
    ])
  )

  function onArticleClick(event: MouseEvent): void {
    const anchor = (event.target as HTMLElement).closest('a')
    if (!anchor) return
    event.preventDefault()
    const href = anchor.getAttribute('href') ?? ''
    const target = topicOfHref(href)
    if (target) show(target, sectionOfHref(href) || null)
    else if (href.startsWith('#')) goToSection(href.slice(1))
  }

  const hasSelection = (): boolean => {
    const sel = window.getSelection()
    return !!sel && !sel.isCollapsed && sel.toString() !== ''
  }

  /** Esc clears the search, else closes Help when no text is selected; Page Down and Page Up scroll the article from anywhere (UX-80). */
  function onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || ctx.open || help.about) return
    if (event.key === 'Escape' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      if (query !== '') query = ''
      else if (!hasSelection()) void host.closeWindow(win.id)
      else return
      event.preventDefault()
    } else if ((event.key === 'PageDown' || event.key === 'PageUp') && article && event.target !== article) {
      event.preventDefault()
      article.scrollBy({ top: (event.key === 'PageDown' ? 1 : -1) * article.clientHeight * 0.9 })
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="help" data-testid="help-app" data-topic={topic} oncontextmenu={(e) => ctx.show(e, contextItems())} onkeydown={(e) => (ctx.key(e, contextItems), onKeydown(e))}>
  <MenuStrip {menus} aria-label="Help menu" />
  <div class="bar" role="toolbar" aria-label="Help toolbar">
    <div class="orbs">
      <button class="orb" data-testid="help-back" aria-label="Back" title="Back" disabled={history.past.length === 0} onclick={() => (history = back(history))}><Icon name="chevron-left" size={16} /></button>
      <button class="orb" data-testid="help-forward" aria-label="Forward" title="Forward" disabled={history.future.length === 0} onclick={() => (history = forward(history))}><Icon name="chevron-right" size={16} /></button>
    </div>
    <ToolStripButton data-testid="help-home" icon="help" text="Home" title="Show the Help and Support home page" onclick={() => show(HOME_TOPIC)} />
    <ToolStripButton data-testid="help-contents" icon="file-text" text="Contents" title="Show or hide the list of topics" checked={contentsOpen} onclick={() => (contentsOpen = !contentsOpen)} />
    <span class="spring"></span>
    <label class="search" for="help-search-box">
      <TextBox id="help-search-box" data-testid="help-search" bind:value={query} bind:ref={searchBox} placeholder="Search Help" aria-label="Search Help" spellcheck={false} />
      <Icon name="search" size={14} />
    </label>
  </div>
  <div class="body">
    {#if contentsOpen}
    <nav class="topics xp-scroll" aria-label="Help topics" data-testid="help-topics">
      <div class="caption">{searching ? 'Search results' : 'Help topics'}</div>
      <ul>
        {#if searching}
          {#each hits as hit (`${hit.topic.id}#${hit.sectionId}`)}
            <li>
              <button type="button" class="topic hit" data-testid="help-result" data-topic={hit.topic.id} data-section={hit.sectionId} onclick={() => show(hit.topic.id, hit.sectionId)}>
                <span class="head"><Icon name="file-text" size={16} /><span class="section-title">{hit.section || hit.topic.title}</span></span>
                <span class="where" data-testid="help-result-topic">{hit.topic.title}</span>
                <span class="snippet" data-testid="help-snippet">{@html markWords(escapeHtml(hit.snippet), words)}</span>
              </button>
            </li>
          {:else}
            <li class="none" data-testid="help-no-results">No sections match your search.</li>
          {/each}
        {:else}
          {#each topics as t (t.id)}
            <li>
              <button type="button" class="topic" class:on={t.id === topic} data-testid="help-topic" data-topic={t.id} aria-current={t.id === topic ? 'page' : undefined} onclick={() => show(t.id)}>
                <span class="head"><Icon name={t.id === HOME_TOPIC ? 'help' : 'file-text'} size={16} />{t.title}</span>
              </button>
            </li>
          {/each}
        {/if}
      </ul>
    </nav>
    {/if}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <article class="article xp-scroll" data-testid="help-article" data-topic={topic} aria-label={current?.title ?? 'Help'} tabindex="0" bind:this={article} onclick={onArticleClick}>
      {#if current}
        <div class="xp-help-md">{@html html}</div>
      {:else}
        <p data-testid="help-missing">This topic does not exist. Click <b>Home</b> to see all topics.</p>
      {/if}
    </article>
  </div>
  <ContextMenuStrip bind:open={ctx.open} x={ctx.x} y={ctx.y} items={ctx.items} label="Help" />
  <AppAbout {help} />
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel testid="help-status" text={searching ? `${hits.length} ${hits.length === 1 ? 'section matches' : 'sections match'}` : (current?.title ?? '')} spring />
    <StatusStripLabel testid="help-status-topic" text={sectionName} borders={['left']} width={190} />
  </StatusStrip>
</div>

<style>
  .help {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--xp-face);
  }
  .bar {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 8px;
    min-height: 36px;
    padding: 4px 8px;
    box-sizing: border-box;
    background: linear-gradient(#e9f0fa, #cbd9ee);
    border-bottom: 1px solid #8ea4c4;
  }
  .orbs {
    display: flex;
    gap: 2px;
  }
  .orb {
    width: 26px;
    height: 26px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 1px solid #5d7aa6;
    background: radial-gradient(circle at 50% 30%, #fff, #b9cdea 60%, #8fadd8);
    color: #1d3f7a;
  }
  .orb:disabled {
    opacity: 0.45;
  }
  .spring {
    flex: 1;
  }
  /* The search box gives way first in a narrow window (down to 110 px) so it never runs past the frame. */
  .search {
    flex: 0 1 220px;
    min-width: 110px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .search :global(.xp-textbox) {
    flex: 1;
    min-width: 0;
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .topics {
    flex: none;
    width: 210px;
    overflow: auto;
    background: #eef3fa;
    border-right: 1px solid #aab7cb;
  }
  .caption {
    padding: 8px 10px 4px;
    color: #003399;
    font-size: 14px;
  }
  ul {
    margin: 0;
    padding: 0 0 8px;
    list-style: none;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .snippet {
    padding-left: 22px;
    color: var(--xp-text-muted);
    font-size: 11px;
    line-height: 1.35;
  }
  .snippet :global(mark),
  .xp-help-md :global(mark) {
    background: #ffe97a;
    color: inherit;
  }
  .section-title {
    font-weight: 700;
    color: #1d3f7a;
  }
  .where {
    padding-left: 22px;
    color: var(--xp-text-muted);
    font-size: 11px;
  }
  .topic {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 1px;
    min-height: 24px;
    padding: 3px 10px;
    border: 1px solid transparent;
    background: transparent;
    font: inherit;
    text-align: left;
    color: #0f2a5a;
  }
  .topic:hover {
    background: linear-gradient(#fafcff, #dbe8f9);
    border-color: #b8d6fb;
  }
  .topic.on {
    background: linear-gradient(#e7f2fe, #c6dcf6);
    border-color: #316ac5;
  }
  .none {
    padding: 6px 10px;
    color: var(--xp-text-muted);
  }
  .article {
    flex: 1;
    min-width: 0;
    overflow: auto;
    padding: 10px 18px 18px;
    background: #fff;
    user-select: text;
    cursor: auto;
  }
  .xp-help-md {
    font: var(--xp-font);
    color: var(--xp-text);
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .xp-help-md :global(h1) {
    margin: 4px 0 8px;
    font-size: 21px;
    font-weight: normal;
    color: #003399;
  }
  .xp-help-md :global(h2) {
    margin: 18px 0 6px;
    padding-bottom: 2px;
    font-size: 17px;
    font-weight: normal;
    color: #003399;
    border-bottom: 1px solid #d5dfee;
  }
  /* The chapters of the Table of Contents other than the current one show their title only (UX-132). */
  .xp-help-md :global(li.toc-collapsed > ul) {
    display: none;
  }
  .xp-help-md :global(.target) {
    background: #fff3b0;
  }
  .xp-help-md :global(.flash) {
    background: #ffe97a;
    outline: 1px solid #e0b800;
  }
  .xp-help-md :global(h3) {
    margin: 12px 0 4px;
    font-size: 14px;
    font-weight: normal;
    color: #1d3f7a;
  }
  .xp-help-md :global(p),
  .xp-help-md :global(ul),
  .xp-help-md :global(ol),
  .xp-help-md :global(table),
  .xp-help-md :global(pre),
  .xp-help-md :global(blockquote) {
    margin: 0 0 10px;
  }
  .xp-help-md :global(ul) {
    padding-left: 22px;
    list-style: disc;
  }
  .xp-help-md :global(ol) {
    padding-left: 24px;
    list-style: decimal;
  }
  .xp-help-md :global(li) {
    margin: 2px 0;
  }
  /* A link is at least 24 px high: padding adds to the hit area without moving the text (UX-83). */
  .xp-help-md :global(a) {
    padding: 5px 0;
    color: var(--xp-link);
    text-decoration: underline;
    cursor: pointer;
  }
  .xp-help-md :global(li > a:only-child) {
    display: inline-block;
    min-height: 24px;
    padding: 3px 0;
    line-height: 18px;
  }
  .xp-help-md :global(.external) {
    color: var(--xp-text-muted);
  }
  .xp-help-md :global(hr) {
    border: 0;
    border-top: 1px solid #d5d5d5;
    border-bottom: 1px solid #fff;
    margin: 12px 0;
  }
  .xp-help-md :global(code) {
    font-family: Consolas, 'DejaVu Sans Mono', 'Liberation Mono', monospace;
    font-size: 12px;
    padding: 0 3px;
    background: #f3f3f3;
    border: 1px solid #e1e1e1;
  }
  .xp-help-md :global(pre) {
    padding: 6px 8px;
    background: #fff;
    border: 1px solid #c8d3e3;
    overflow: auto;
  }
  .xp-help-md :global(pre code) {
    padding: 0;
    border: 0;
    background: none;
    white-space: pre;
  }
  .xp-help-md :global(table) {
    border-collapse: collapse;
    display: block;
    overflow-x: auto;
  }
  .xp-help-md :global(th),
  .xp-help-md :global(td) {
    border: 1px solid #a0a0a0;
    padding: 3px 8px;
    text-align: left;
    vertical-align: top;
  }
  .xp-help-md :global(th) {
    background: linear-gradient(#fff, #f1f1f1 90%, #ece9d8);
    font-weight: normal;
  }
</style>
