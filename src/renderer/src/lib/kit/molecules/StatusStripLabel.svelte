<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from '../atoms/Icon.svelte'
  import type { IconName } from '../atoms/icons'

  interface Props {
    text?: string
    icon?: IconName
    /** Fill the remaining width (Spring = true); the text is left aligned. */
    spring?: boolean
    /** Etched separator lines on these sides. */
    borders?: ('left' | 'right')[]
    textAlign?: 'left' | 'right' | 'center'
    /** Fixed width in px. */
    width?: number
    class?: string
    testid?: string
    children?: Snippet
  }

  let { text, icon, spring = false, borders = [], textAlign = 'left', width, class: className = '', testid, children }: Props = $props()
</script>

<span
  data-testid={testid}
  class="sl {className}"
  class:spring
  class:bl={borders.includes('left')}
  class:br={borders.includes('right')}
  style:width={width ? `${width}px` : undefined}
  style:justify-content={textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center'}
>
  {#if icon}<Icon name={icon} />{/if}
  {#if children}{@render children()}{:else if text}<span class="t">{text}</span>{/if}
</span>

<style>
  .sl {
    display: inline-flex;
    align-items: center;
    align-self: stretch;
    gap: 4px;
    padding: 0 10px;
    white-space: nowrap;
    overflow: hidden;
  }
  .t {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .spring {
    flex: 1;
    min-width: 0;
    padding: 0 8px;
  }
  .bl {
    border-left: 1px solid var(--xp-etched-dark);
  }
  .br {
    border-right: 1px solid var(--xp-etched-dark);
  }
</style>
