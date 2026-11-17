<script lang="ts">
  import Icon from '../atoms/Icon.svelte'
  import type { IconName } from '../atoms/icons'

  interface Props {
    /** The step: a short title in blue. */
    title: string
    /** One sentence that says what the step is for. */
    description?: string
    icon?: IconName
    class?: string
    testid?: string
  }

  let { title, description = '', icon, class: className = '', testid }: Props = $props()
</script>

<header class="w7-wizard-header {className}" data-testid={testid}>
  <div class="text">
    <h2>{title}</h2>
    {#if description}<p>{description}</p>{/if}
  </div>
  {#if icon}<Icon name={icon} size={32} />{/if}
</header>

<style>
  .w7-wizard-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: #fff;
    border-bottom: 1px solid var(--w7-group-border);
    box-shadow: 0 1px 0 #fff;
    font: var(--w7-font);
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  h2 {
    margin: 0;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    color: var(--w7-text);
  }
  p {
    margin: 2px 0 0 14px;
    color: var(--w7-text);
  }
</style>
