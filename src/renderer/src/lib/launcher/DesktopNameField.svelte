<script lang="ts">
  /**
   * The Name box of the New and Rename desktop dialogs. It checks the name on every key: a name that another desktop
   * uses shows the reason in red and a button that fills in a free name.
   */
  import Icon from '../kit/atoms/Icon.svelte'
  import Label from '../kit/atoms/Label.svelte'
  import TextBox from '../kit/atoms/TextBox.svelte'
  import { nameSuggestion, projectSuggestion, validateDesktopName } from './launcherModel'

  interface Props {
    value: string
    label: string
    /** Names of the other desktops. */
    existingNames?: string[]
    /** Prefix of the test ids: `<idPrefix>-name`, `<prefix>-error`, `<prefix>-use-suggestion` (numbered) and `<prefix>-use-project-suggestion`. */
    idPrefix: string
    /** Name of the first chosen project folder: a taken name then also offers "name - project". */
    project?: string
  }

  let { value = $bindable(), label, existingNames = [], idPrefix, project }: Props = $props()

  const uid = $props.id()
  const error = $derived(validateDesktopName(value, existingNames))
  const suggestion = $derived(nameSuggestion(value, existingNames))
  const withProject = $derived(projectSuggestion(value, project, existingNames))

  /** Fills the name box and leaves the focus in it. */
  function use(name: string): void {
    value = name
    document.getElementById(`${uid}-name`)?.focus()
  }
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
  <!-- A fixed area (two lines of text and a row for the links): the dialog does not change size when a message comes or goes. -->
  <div class="feedback">
    <div id="{uid}-error" class="error" role="alert" data-testid="{idPrefix}-error">
      {#if error}
        <Icon name="error" size={14} />
        <span>{error}</span>
      {/if}
    </div>
    <div class="links">
      {#if withProject}
        <button type="button" class="use" data-testid="{idPrefix}-use-project-suggestion" onclick={() => use(withProject)}>Use '{withProject}'</button>
      {/if}
      {#if suggestion}
        <button type="button" class="use" data-testid="{idPrefix}-use-suggestion" onclick={() => use(suggestion)}>Use '{suggestion}'</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .feedback {
    flex: none;
    height: 56px;
    overflow: hidden;
  }
  .error {
    height: 36px;
    overflow: hidden;
    line-height: 18px;
    display: flex;
    gap: 5px;
    align-items: flex-start;
    color: #a01408;
  }
  .error :global(svg) {
    flex: none;
    margin-top: 1px;
  }
  .links {
    height: 20px;
    display: flex;
    flex-wrap: nowrap;
    gap: 14px;
    overflow: hidden;
    white-space: nowrap;
  }
  .use {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0;
    border: 0;
    background: none;
    color: #0b3b9c;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
  .use:focus-visible {
    outline: var(--xp-focus-outline);
  }
</style>
