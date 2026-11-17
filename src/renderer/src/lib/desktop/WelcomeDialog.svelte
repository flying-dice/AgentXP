<script lang="ts">
  import Button from '../kit/atoms/Button.svelte'
  import Icon from '../kit/atoms/Icon.svelte'
  import Dialog from '../kit/organisms/Dialog.svelte'

  interface Props {
    onopen?: () => void
  }

  let { onopen }: Props = $props()
</script>

<Dialog testid="welcome-dialog" title="Welcome to AgentXP" iconName="agentxp" width="440px" closable={false} contained bodyColor="window">
  <div class="body">
    <Icon name="agentxp" size={48} />
    <div>
      <h2>Open a desktop to get started</h2>
      <p>A desktop is a small Windows XP machine for one project. It has its own place for your files (C:), and your projects plug in as USB drives that you can safely remove. Pick or create one in AgentXP Desktops.</p>
    </div>
  </div>
  {#snippet buttons()}
    <div class="buttons"><Button data-testid="welcome-open-launcher" isDefault data-autofocus onclick={() => onopen?.()}>AgentXP Desktops…</Button></div>
  {/snippet}
</Dialog>

<style>
  .body {
    display: flex;
    gap: 14px;
    padding: 18px 18px 14px;
    background: var(--xp-window);
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
