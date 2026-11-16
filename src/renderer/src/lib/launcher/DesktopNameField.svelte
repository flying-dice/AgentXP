<script lang="ts">
  /**
   * The Name box of the New and Rename desktop dialogs. It checks the name on every key: a name that another desktop
   * uses shows the reason in red and a button that fills in a free name.
   */
  import Icon from '../kit/atoms/Icon.svelte'
  import Label from '../kit/atoms/Label.svelte'
  import TextBox from '../kit/atoms/TextBox.svelte'
  import { nameSuggestion, validateDesktopName } from './launcherModel'

  interface Props {
    value: string
    label: string
    /** Names of the other desktops. */
    existingNames?: string[]
    /** Prefix of the test ids: `<idPrefix>-name`, `<prefix>-error`, `<prefix>-use-suggestion`. */
    idPrefix: string
  }

  let { value = $bindable(), label, existingNames = [], idPrefix }: Props = $props()

  const uid = $props.id()
  const error = $derived(validateDesktopName(value, existingNames))
  const suggestion = $derived(nameSuggestion(value, existingNames))
</script>

<div class="field">
  <Label text={label} for="{uid}-name" />
  <TextBox
    id="{uid}-name"
    data-testid="{idPrefix}-name"
    bind:value
    aria-invalid={error ? 'true' : undefined}
    aria-describedby="{uid}-error"
    data-autofocus
    onfocus={(e) => (e.currentTarget as HTMLInputElement).select()}
  />
  <div id="{uid}-error" class="error" role="alert" data-testid="{idPrefix}-error">
    {#if error}
      <Icon name="error" size={14} />
      <span>{error}</span>
    {/if}
  </div>
  {#if suggestion}
    <button type="button" class="use" data-testid="{idPrefix}-use-suggestion" onclick={() => (value = suggestion)}>Use '{suggestion}'</button>
  {/if}
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .error {
    min-height: 15px;
    display: flex;
    gap: 5px;
    align-items: flex-start;
    color: #a01408;
  }
  .error :global(svg) {
    flex: none;
    margin-top: 1px;
  }
  .use {
    align-self: flex-start;
    padding: 0;
    border: 0;
    background: none;
    color: #0b3b9c;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
  .use:focus-visible {
    outline: var(--w7-focus-outline);
  }
</style>
