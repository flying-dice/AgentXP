<script lang="ts">
  /** Help and Support: the manuals of docs/help, a topic list, an article, Back, Forward, Home and a search box. */
  import { tick, untrack } from 'svelte'
  import type { AppProps } from '../types'
  import Icon from '../../kit/atoms/Icon.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import { ViewSync } from '../viewSync'
  import { HOME_TOPIC, back, forward, searchTopics, startHistory, topicOfHref, visit, type HelpTopic } from './helpModel'
  import { renderHelpMarkdown } from './helpMarkdown'
  import { helpTopics } from './helpTopics'

  interface Props extends AppProps<'help'> {
    /** The manuals; the manuals of docs/help by default (stories and tests pass their own). */
    topics?: HelpTopic[]
  }

  let { window: win, host, topics = helpTopics }: Props = $props()

  // svelte-ignore state_referenced_locally
  let history = $state.raw(startHistory(win.view.topic || HOME_TOPIC))
  let query = $state('')
  let article = $state<HTMLElement | null>(null)

  const sync = new ViewSync<{ topic: string }>((v) => v.topic)
  const topic = $derived(history.current)
  const current = $derived(topics.find((t) => t.id === topic) ?? null)
  const shown = $derived(searchTopics(topics, query))
  const html = $derived(current ? renderHelpMarkdown(current.body) : '')
  const searching = $derived(query.trim() !== '')

  function show(next: string): void {
    history = visit(history, next)
  }

  // Report the topic (the shell stores it) and follow a topic that arrives from outside (F1 on another window).
  $effect(() => {
    const view = { topic }
    if (sync.mark(view)) untrack(() => host.updateView(win.id, { app: 'help', topic }))
  })
  $effect(() => {
    const incoming = win.view.topic
    if (!incoming || !sync.isExternal({ topic: incoming })) return
    untrack(() => show(incoming))
  })
  // A new article starts at the top.
  $effect(() => {
    void html
    void tick().then(() => article && (article.scrollTop = 0))
  })

  function onArticleClick(event: MouseEvent): void {
    const anchor = (event.target as HTMLElement).closest('a')
    if (!anchor) return
    event.preventDefault()
    const href = anchor.getAttribute('href') ?? ''
    const target = topicOfHref(href)
    if (target) show(target)
    else if (href.startsWith('#')) article?.querySelector(`[id="${CSS.escape(href.slice(1))}"]`)?.scrollIntoView({ block: 'start' })
  }
</script>

<div class="help" data-testid="help-app" data-topic={topic}>
  <div class="bar" role="toolbar" aria-label="Help toolbar">
    <div class="orbs">
      <button class="orb" data-testid="help-back" aria-label="Back" title="Back" disabled={history.past.length === 0} onclick={() => (history = back(history))}><Icon name="chevron-left" size={16} /></button>
      <button class="orb" data-testid="help-forward" aria-label="Forward" title="Forward" disabled={history.future.length === 0} onclick={() => (history = forward(history))}><Icon name="chevron-right" size={16} /></button>
    </div>
    <ToolStripButton data-testid="help-home" icon="help" text="Home" title="Help and Support home" onclick={() => show(HOME_TOPIC)} />
    <span class="spring"></span>
    <label class="search" for="help-search-box">
      <TextBox id="help-search-box" data-testid="help-search" bind:value={query} placeholder="Search Help" aria-label="Search Help" spellcheck={false} />
      <Icon name="search" size={14} />
    </label>
  </div>
  <div class="body">
    <nav class="topics w7-scroll" aria-label="Help topics" data-testid="help-topics">
      <div class="caption">{searching ? 'Search results' : 'Help topics'}</div>
      <ul>
        {#each shown as t (t.id)}
          <li>
            <button type="button" class="topic" class:on={t.id === topic} data-testid="help-topic" data-topic={t.id} aria-current={t.id === topic ? 'page' : undefined} onclick={() => show(t.id)}>
              <Icon name={t.id === HOME_TOPIC ? 'help' : 'file-text'} size={16} />{t.title}
            </button>
          </li>
        {:else}
          <li class="none" data-testid="help-no-results">No topics match your search.</li>
        {/each}
      </ul>
    </nav>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <article class="article w7-scroll" data-testid="help-article" data-topic={topic} aria-label={current?.title ?? 'Help'} bind:this={article} onclick={onArticleClick}>
      {#if current}
        <div class="w7-help-md">{@html html}</div>
      {:else}
        <p data-testid="help-missing">This topic does not exist. Click <b>Home</b> to see all topics.</p>
      {/if}
    </article>
  </div>
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel testid="help-status" text={searching ? `${shown.length} of ${topics.length} topics` : (current?.title ?? '')} spring />
    <StatusStripLabel text="Topic: {topic}" borders={['left']} width={170} />
  </StatusStrip>
</div>

<style>
  .help {
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
    gap: 8px;
    height: 36px;
    padding: 0 8px;
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
  .search {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 220px;
  }
  .search :global(.w7-textbox) {
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
  .topic {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 6px;
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
    border-color: #7da2ce;
  }
  .none {
    padding: 6px 10px;
    color: var(--w7-text-muted);
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
  .w7-help-md {
    font: var(--w7-font);
    color: var(--w7-text);
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .w7-help-md :global(h1) {
    margin: 4px 0 8px;
    font-size: 21px;
    font-weight: normal;
    color: #003399;
  }
  .w7-help-md :global(h2) {
    margin: 18px 0 6px;
    padding-bottom: 2px;
    font-size: 17px;
    font-weight: normal;
    color: #003399;
    border-bottom: 1px solid #d5dfee;
  }
  .w7-help-md :global(h3) {
    margin: 12px 0 4px;
    font-size: 14px;
    font-weight: normal;
    color: #1d3f7a;
  }
  .w7-help-md :global(p),
  .w7-help-md :global(ul),
  .w7-help-md :global(ol),
  .w7-help-md :global(table),
  .w7-help-md :global(pre),
  .w7-help-md :global(blockquote) {
    margin: 0 0 10px;
  }
  .w7-help-md :global(ul) {
    padding-left: 22px;
    list-style: disc;
  }
  .w7-help-md :global(ol) {
    padding-left: 24px;
    list-style: decimal;
  }
  .w7-help-md :global(li) {
    margin: 2px 0;
  }
  .w7-help-md :global(a) {
    color: var(--w7-link);
    text-decoration: underline;
    cursor: pointer;
  }
  .w7-help-md :global(.external) {
    color: var(--w7-text-muted);
  }
  .w7-help-md :global(hr) {
    border: 0;
    border-top: 1px solid #d5d5d5;
    border-bottom: 1px solid #fff;
    margin: 12px 0;
  }
  .w7-help-md :global(code) {
    font-family: Consolas, 'DejaVu Sans Mono', 'Liberation Mono', monospace;
    font-size: 12px;
    padding: 0 3px;
    background: #f3f3f3;
    border: 1px solid #e1e1e1;
  }
  .w7-help-md :global(pre) {
    padding: 6px 8px;
    background: #fff;
    border: 1px solid #c8d3e3;
    overflow: auto;
  }
  .w7-help-md :global(pre code) {
    padding: 0;
    border: 0;
    background: none;
    white-space: pre;
  }
  .w7-help-md :global(table) {
    border-collapse: collapse;
    display: block;
    overflow-x: auto;
  }
  .w7-help-md :global(th),
  .w7-help-md :global(td) {
    border: 1px solid #a0a0a0;
    padding: 3px 8px;
    text-align: left;
    vertical-align: top;
  }
  .w7-help-md :global(th) {
    background: linear-gradient(#fff, #f1f1f1 90%, #e6e6e6);
    font-weight: normal;
  }
</style>
