<script lang="ts">
  /** The small "About <App>" box of a Help menu: icon, name, version and one line. */
  import { onMount } from 'svelte'
  import Button from '../atoms/Button.svelte'
  import Icon from '../atoms/Icon.svelte'
  import type { IconName } from '../atoms/icons'
  import { aboutLine } from './aboutText'
  import Dialog from './Dialog.svelte'

  interface Props {
    /** `data-testid` of the dialog; its OK button is `<testid>-ok`. */
    testid: string
    name: string
    icon: IconName
    /** One line about the app. */
    description?: string
    /** Version text; loaded by the caller (`host.api.app.version()`). */
    version?: string
    onclose: () => void
  }

  let { testid, name, icon, description = '', version = '', onclose }: Props = $props()
  let ok = $state<HTMLElement | null>(null)
  onMount(() => ok?.querySelector('button')?.focus())
</script>

<Dialog {testid} title="About {name}" iconName={icon} width="380px" bodyColor="window" {onclose}>
  <div class="about">
    <Icon name={icon} size={32} />
    <div class="text">
      <div class="name">{name}</div>
      <div data-testid="{testid}-line">{aboutLine(name, version)}</div>
      {#if description}<p>{description}</p>{/if}
    </div>
  </div>
  {#snippet buttons()}
    <div class="ok" bind:this={ok}><Button data-testid="{testid}-ok" isDefault onclick={onclose}>OK</Button></div>
  {/snippet}
</Dialog>

<style>
  .about {
    display: flex;
    gap: 14px;
    padding: 14px 16px 6px;
    background: var(--xp-window);
  }
  .name {
    font-size: 16px;
    color: #003399;
  }
  p {
    margin: 8px 0 0;
  }
  .ok {
    display: flex;
    justify-content: flex-end;
  }
</style>
