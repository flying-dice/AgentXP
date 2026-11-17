<script lang="ts">
  import ToolTip from './ToolTip.svelte'

  interface Props {
    /** Validation message; the icon is hidden when empty. */
    message?: string
    class?: string
  }

  let { message = '', class: className = '' }: Props = $props()
</script>

{#if message}
  <ToolTip text={message} delay={150} class={className}>
    <span class="xp-error" role="img" aria-label="Error: {message}">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <defs>
          <radialGradient id="xp-ep-g" cx=".35" cy=".3" r=".85">
            <stop offset="0" stop-color="#ff9d94" />
            <stop offset="1" stop-color="#d12a22" />
          </radialGradient>
        </defs>
        <circle cx="8" cy="8" r="6.8" fill="url(#xp-ep-g)" stroke="#8f1d18" />
        <path d="M8 3.8v5" stroke="#fff" stroke-width="2.2" />
        <circle cx="8" cy="11.6" r="1.2" fill="#fff" />
      </svg>
    </span>
  </ToolTip>
{/if}

<style>
  .xp-error {
    display: inline-flex;
    width: 16px;
    height: 16px;
  }
</style>
