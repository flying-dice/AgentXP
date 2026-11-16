<script lang="ts">
  import Button from '../kit/atoms/Button.svelte'
  import Icon from '../kit/atoms/Icon.svelte'
  import Dialog from '../kit/organisms/Dialog.svelte'

  interface Props {
    onopen?: () => void
  }

  let { onopen }: Props = $props()
</script>

<Dialog title="Welcome to Agent7" iconName="agent7" width="440px" closable={false} contained bodyColor="window">
  <div class="body">
    <Icon name="agent7" size={48} />
    <div>
      <h2>Open a folder to start a desktop</h2>
      <p>A desktop is a small Windows 7 machine for one project. The folder you choose becomes drive W:, and your agent works through the apps you open on it.</p>
    </div>
  </div>
  {#snippet buttons()}
    <div class="buttons"><Button isDefault data-autofocus onclick={() => onopen?.()}>Open folder…</Button></div>
  {/snippet}
</Dialog>

<style>
  .body {
    display: flex;
    gap: 14px;
    padding: 18px 18px 14px;
    background: var(--w7-window);
  }
  h2 {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 400;
    color: #003399;
  }
  p {
    margin: 0;
    line-height: 1.4;
  }
  .buttons {
    display: flex;
    justify-content: flex-end;
  }
</style>
