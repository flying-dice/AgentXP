<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    /** The sections: `TaskPaneSection` blocks. */
    children?: Snippet
    class?: string
    'aria-label'?: string
    /** `data-testid` of the pane. */
    testid?: string
  }

  let { children, class: className = '', 'aria-label': ariaLabel = 'Tasks', testid }: Props = $props()
</script>

<!-- The left pane of a Windows XP folder window: blue sections of links and details. -->
<nav class="xp-taskpane {className}" aria-label={ariaLabel} data-testid={testid}>
  {@render children?.()}
</nav>

<style>
  .xp-taskpane {
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-sizing: border-box;
    height: 100%;
    padding: 10px 8px;
    overflow: auto;
    font: var(--xp-font);
    background: var(--xp-taskpane-face);
  }
</style>
