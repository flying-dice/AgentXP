<script lang="ts">
  import Button from '../../kit/atoms/Button.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import type { ComboItem } from '../../kit/atoms/ComboBox'
  import Icon from '../../kit/atoms/Icon.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import TaskPaneSection from '../../kit/molecules/TaskPaneSection.svelte'
  import TaskPane from '../../kit/organisms/TaskPane.svelte'

  /**
   * Explorer's Search Companion (the XP search pane in place of the Folders pane): all or part of the file name, a word
   * or phrase in the file, and where to look. The agent's fs_find fills it in too. The parent runs the search.
   */
  interface Props {
    name: string
    containing: string
    root: string
    lookIn: ComboItem[]
    status: string
    searching: boolean
    /** The agent ran the search shown. */
    byAgent: boolean
    onsearch: () => void
    onback: () => void
  }

  let { name = $bindable(), containing = $bindable(), root = $bindable(), lookIn, status, searching, byAgent, onsearch, onback }: Props = $props()

  const canSearch = $derived(!searching && (name.trim() !== '' || containing.trim() !== ''))

  function onkeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (canSearch) onsearch()
  }
</script>

<div class="companion" data-testid="explorer-search-pane" data-searching={searching ? 'true' : 'false'}>
  <TaskPane aria-label="Search Companion">
    <TaskPaneSection title="Search" collapsible={false} testid="explorer-search-section">
      <div class="form">
        <p class="intro">Search by any or all of the criteria below.</p>
        <label class="field">
          <span>All or part of the file name:</span>
          <TextBox data-testid="explorer-search-name" bind:value={name} {onkeydown} />
        </label>
        <label class="field">
          <span>A word or phrase in the file:</span>
          <TextBox data-testid="explorer-search-containing" bind:value={containing} {onkeydown} />
        </label>
        <div class="field">
          <span>Look in:</span>
          <ComboBox testid="explorer-search-look-in" items={lookIn} bind:value={root} dropDownStyle="DropDown" aria-label="Look in" />
        </div>
        <div class="buttons">
          <Button data-testid="explorer-search-back" onclick={onback}>Back</Button>
          <Button data-testid="explorer-search-run" isDefault disabled={!canSearch} onclick={onsearch}>Search</Button>
        </div>
        <p class="status" data-testid="explorer-search-status" role="status">
          {#if byAgent && !searching}<Icon name="agent" />{/if}
          <span>{status}</span>
        </p>
      </div>
    </TaskPaneSection>
  </TaskPane>
</div>

<style>
  .companion {
    height: 100%;
    min-height: 0;
    overflow: auto;
    background: var(--xp-taskpane-face);
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .field :global(input),
  .field :global(.xp-combo) {
    width: 100%;
    box-sizing: border-box;
  }
  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 2px;
  }
  .intro {
    margin: 0;
    font-weight: 700;
  }
  .status {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    margin: 2px 0 0;
    color: var(--xp-text);
  }
</style>
