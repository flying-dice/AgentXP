<script lang="ts">
  interface Props {
    text: string
    /** File names attached to the message. */
    attachments?: string[]
  }

  let { text, attachments = [] }: Props = $props()
</script>

<div class="user-message" data-testid="chat-message-user">
  <div class="who">You</div>
  {#if text}<div class="body">{text}</div>{/if}
  {#if attachments.length > 0}
    <div class="files">
      {#each attachments as name, i (i)}<span class="file">{name}</span>{/each}
    </div>
  {/if}
</div>

<style>
  .who {
    font-weight: 700;
    color: var(--w7-accent-user, #1b3f8b);
    margin-bottom: 2px;
  }
  .body {
    font-size: 13px;
    line-height: 1.45;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .files {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }
  .file {
    padding: 0 6px;
    border: 1px solid var(--w7-hot-border);
    background: var(--w7-hot-face);
    color: var(--w7-text-muted);
    line-height: 17px;
  }
</style>
