<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../../kit/atoms/Icon.svelte'
  import logo from '../../../../../../resources/icon-256.png'
  import type { DesktopHost } from '../types'

  interface Props {
    host: DesktopHost
  }

  let { host }: Props = $props()

  let version = $state('')
  let logoFailed = $state(false)

  onMount(() => {
    void host.api.app.version().then((v) => (version = v))
  })
</script>

<div class="about">
  {#if logoFailed}
    <Icon name="agent7" size={64} />
  {:else}
    <img src={logo} width="72" height="72" alt="Agent7" onerror={() => (logoFailed = true)} />
  {/if}
  <div class="text">
    <div class="name">Agent7</div>
    <div class="version" data-testid="control-centre-version">{version ? `Version ${version}` : ''}</div>
    <p>A Windows 7 style desktop for coding agents. The agent lives on this desktop and works through its apps.</p>
    <p class="muted">Windows 7 is the look; the agents are modern. Built with Electron and Svelte.</p>
  </div>
</div>

<style>
  .about {
    display: flex;
    gap: 18px;
    padding: 6px 4px;
  }
  .about img {
    flex: none;
    image-rendering: auto;
  }
  .name {
    font-size: 22px;
    color: #003399;
  }
  .version {
    margin-top: 2px;
  }
  p {
    margin: 10px 0 0;
  }
  .muted {
    color: var(--w7-text-muted);
  }
</style>
