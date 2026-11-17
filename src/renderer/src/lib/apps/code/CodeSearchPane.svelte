<script lang="ts">
  import type { TextMatchDto, TextSearchResultDto } from '@shared/search'
  import { textSearchSummary } from '@shared/search'
  import Button from '../../kit/atoms/Button.svelte'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import type { ComboItem } from '../../kit/atoms/ComboBox'
  import Icon from '../../kit/atoms/Icon.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import { groupMatches, matchParts } from './codeSearch'

  /**
   * The Search tab of the Code app's Management pane: find in files (what the agent's code_search shows too).
   * The parent runs the search (`onsearch`) and opens a match (`onopen`).
   */
  interface Props {
    query: string
    regex: boolean
    matchCase: boolean
    include: string
    root: string
    lookIn: ComboItem[]
    result: TextSearchResultDto | null
    searching: boolean
    error: string | null
    /** The agent ran the search shown. */
    byAgent: boolean
    onsearch: () => void
    onopen: (match: TextMatchDto) => void
  }

  let {
    query = $bindable(),
    regex = $bindable(),
    matchCase = $bindable(),
    include = $bindable(),
    root = $bindable(),
    lookIn,
    result,
    searching,
    error,
    byAgent,
    onsearch,
    onopen
  }: Props = $props()

  const groups = $derived(result ? groupMatches(result.matches) : [])
  const summary = $derived(searching ? 'Searching...' : (error ?? (result ? textSearchSummary(result) : 'Type the text to find, then press Enter.')))

  function onkeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return
    event.preventDefault()
    onsearch()
  }
</script>

<div class="search" data-testid="code-search" data-searching={searching ? 'true' : 'false'}>
  <div class="form">
    <TextBox data-testid="code-search-query" bind:value={query} placeholder="Find in files" aria-label="Find in files" {onkeydown} />
    <div class="options">
      <CheckBox testid="code-search-match-case" label="Match case" bind:checked={matchCase} />
      <CheckBox testid="code-search-regex" label="Regular expression" bind:checked={regex} />
    </div>
    <TextBox data-testid="code-search-include" bind:value={include} placeholder="Files to include, e.g. *.ts, *.svelte" aria-label="Files to include" {onkeydown} />
    <div class="row">
      <span class="label">Look in:</span>
      <ComboBox testid="code-search-look-in" items={lookIn} bind:value={root} dropDownStyle="DropDown" aria-label="Look in" class="look-in" />
      <Button data-testid="code-search-run" disabled={searching || query === ''} onclick={onsearch}>Search</Button>
    </div>
  </div>
  <div class="summary" class:error={error !== null} data-testid="code-search-summary" role="status">
    {#if byAgent && result && !searching && !error}<Icon name="agent" />{/if}
    <span>{summary}</span>
  </div>
  <div class="results" data-testid="code-search-results" role="list" aria-label="Search results">
    {#each groups as group (group.path)}
      <div class="group" role="listitem">
        <button type="button" class="file" data-testid="code-search-file" data-path={group.path} title={group.path} onclick={() => onopen(group.matches[0]!)}>
          <Icon name="file-code" />
          <span class="name">{group.name}</span>
          <span class="folder">{group.folder}</span>
          <span class="count">{group.matches.length}</span>
        </button>
        {#each group.matches as m (m.line)}
          {@const parts = matchParts(m)}
          <button type="button" class="match" data-testid="code-search-result" data-path={m.path} data-line={m.line} title="{m.path}, line {m.line}" onclick={() => onopen(m)}>
            <span class="ln">{m.line}</span>
            <span class="text">{parts.before}<mark>{parts.hit}</mark>{parts.after}</span>
          </button>
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .search {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    font: var(--xp-font);
    color: var(--xp-text);
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px;
  }
  .form :global(input) {
    width: 100%;
    box-sizing: border-box;
  }
  .options {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .label {
    flex: none;
  }
  .row :global(.look-in) {
    flex: 1;
    min-width: 0;
  }
  .summary {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px 4px;
    color: var(--xp-text-muted);
  }
  .summary.error {
    color: #c00;
  }
  .results {
    flex: 1;
    min-height: 0;
    overflow: auto;
    margin: 0 6px 6px;
    border: 1px solid var(--xp-list-border);
    background: var(--xp-window);
  }
  button {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    min-width: 0;
    padding: 1px 4px;
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: default;
  }
  button:hover {
    border-color: var(--xp-hot-border);
    background: var(--xp-hot-face);
  }
  button:focus-visible {
    outline: var(--xp-focus-outline);
  }
  .file {
    font-weight: 700;
  }
  .name {
    flex: none;
  }
  .folder {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 400;
    color: var(--xp-text-muted);
  }
  .count {
    flex: none;
    padding: 0 4px;
    border: 1px solid var(--xp-panel-border);
    font-weight: 400;
  }
  .match {
    padding-left: 22px;
  }
  .ln {
    flex: none;
    min-width: 28px;
    text-align: right;
    color: var(--xp-text-muted);
    font: var(--xp-font-mono);
  }
  .text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: pre;
    font: var(--xp-font-mono);
  }
  mark {
    background: #ffe680;
    color: inherit;
    font-weight: 700;
  }
</style>
