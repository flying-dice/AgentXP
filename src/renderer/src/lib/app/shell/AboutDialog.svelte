<script lang="ts">
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import Icon from '../../kit/atoms/Icon.svelte'

  interface Props {
    version: string
    onclose?: () => void
  }

  let { version, onclose }: Props = $props()
</script>

<Dialog title="About Agent7" iconName="agent7" width="420px" bodyColor="window" {onclose}>
  <div class="about">
    <Icon name="agent7" size={48} />
    <div class="text">
      <div class="name">Agent7</div>
      <div class="version">Version {version || '0.0.0'}</div>
      <p>A Windows 7 era desktop harness for coding agents that speak the Agent Client Protocol (ACP).</p>
      <p class="muted">Windows 7 is the look; the agents are modern. Built with Electron and Svelte.</p>
    </div>
  </div>
  {#snippet buttons()}
    <DialogButtons buttons={['ok']} onresult={() => onclose?.()} />
  {/snippet}
</Dialog>

<style>
  .about {
    display: flex;
    gap: 16px;
    padding: 6px 4px 0;
  }
  .name {
    font-size: 20px;
    color: #003399;
  }
  .version {
    margin-top: 2px;
    color: var(--w7-text-muted);
  }
  p {
    margin: 10px 0 0;
  }
  .muted {
    color: var(--w7-text-muted);
  }
</style>
