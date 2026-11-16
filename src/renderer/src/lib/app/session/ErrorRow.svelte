<script lang="ts">
  import MessageIcon from '../../kit/molecules/MessageIcon.svelte'

  let { message }: { message: string } = $props()
</script>

<div class="error-row" role="alert" data-testid="chat-error">
  <MessageIcon kind="error" size={20} />
  <span class="text">{message}</span>
</div>

<style>
  .error-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 4px 6px;
    border: 1px solid #d9a5a1;
    background: #fff0ef;
    color: #7a0000;
  }
  .text {
    padding-top: 2px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
  }
</style>
