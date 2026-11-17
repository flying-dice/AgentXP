<script lang="ts">
  /** Notepad's Find box: the text to look for, Match case, Find Next. It stays open so Find Next can be repeated. */
  import Button from '../../kit/atoms/Button.svelte'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'

  interface Props {
    /** The text shown first (the selection). */
    query?: string
    /** Finds the next match; returns false when there is none. */
    onfind: (query: string, matchCase: boolean) => boolean
    onclose: () => void
  }

  let { query = '', onfind, onclose }: Props = $props()
  // svelte-ignore state_referenced_locally
  let value = $state(query)
  let matchCase = $state(false)
  let missing = $state(false)

  function next(): void {
    missing = value !== '' && !onfind(value, matchCase)
  }
</script>

<Dialog testid="notepad-find-dialog" title="Find" iconName="search" width="340px" contained {onclose}>
  <div class="find">
    <label for="notepad-find-what">Find what:</label>
    <TextBox id="notepad-find-what" data-testid="notepad-find-text" bind:value onkeydown={(e) => e.key === 'Enter' && next()} oninput={() => (missing = false)} />
    <CheckBox testid="notepad-find-case" label="Match case" bind:checked={matchCase} />
    <div class="missing" data-testid="notepad-find-missing" role="status">{missing ? `Cannot find "${value}".` : ''}</div>
  </div>
  {#snippet buttons()}
    <Button data-testid="notepad-find-next" disabled={value === ''} onclick={next}>Find Next</Button>
    <Button data-testid="notepad-find-cancel" onclick={onclose}>Cancel</Button>
  {/snippet}
</Dialog>

<style>
  .find {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
  }
  .missing {
    min-height: 1.2em;
    color: var(--xp-text-muted);
  }
</style>
