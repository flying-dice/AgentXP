<script lang="ts">
  import Icon from '../../kit/atoms/Icon.svelte'

  interface Props {
    title: string
    /** Where the chat works, as a person says it. */
    path?: string
    /** The full path, as the tooltip of `path`. */
    fullPath?: string
  }

  let { title, path = '', fullPath = path }: Props = $props()
</script>

<div class="header">
  <Icon name="session" size={16} />
  <b class="title">{title}</b>
  {#if path}<span class="path" title={fullPath}>{path}</span>{/if}
</div>

<style>
  .header {
    flex: none;
    height: 22px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 6px;
    background: linear-gradient(#f9fbfd, #e4ecf6);
    border: 1px solid #9aa9bf;
    border-bottom: 0;
  }
  .title {
    flex: none;
    max-width: 50%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .path {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #444;
  }
</style>
