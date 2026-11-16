<script lang="ts">
  import { untrack } from 'svelte'
  import type { AppProps } from '../types'
  import Icon from '../../kit/atoms/Icon.svelte'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import { ViewSync } from '../viewSync'
  import { BLANK, hostOf, inElectron, isSecure, normalizeAddress } from './address'
  import PlaceholderPage from './PlaceholderPage.svelte'
  import type { WebviewElement } from './webview'

  let { window: win, host }: AppProps<'browser'> = $props()

  const electron = inElectron()
  // svelte-ignore state_referenced_locally
  const firstUrl = win.view.url || BLANK

  let url = $state(firstUrl)
  // svelte-ignore state_referenced_locally
  let title = $state(win.view.title)
  let loading = $state(false)
  // svelte-ignore state_referenced_locally
  let address = $state(firstUrl === BLANK ? '' : firstUrl)
  let canBack = $state(false)
  let canForward = $state(false)
  let view = $state<WebviewElement | null>(null)
  let ready = false
  /** Placeholder browsing (Storybook): our own history. */
  let trail = $state.raw<string[]>([firstUrl])
  let at = $state(0)
  let timer: ReturnType<typeof setTimeout> | undefined

  const sync = new ViewSync<{ url: string }>((v) => v.url)

  function report(): void {
    if (sync.mark({ url })) host.updateView(win.id, { app: 'browser', url, title, loading })
    else if (win.view.title !== title || win.view.loading !== loading) host.updateView(win.id, { app: 'browser', url, title, loading })
  }

  function settle(target: string): void {
    loading = false
    title = target === BLANK ? '' : hostOf(target)
    report()
  }

  function navigate(target: string): void {
    url = target
    address = target === BLANK ? '' : target
    if (electron) {
      loading = true
      if (view && ready) void view.loadURL(target).catch(() => {})
      else if (view) view.src = target
    } else {
      trail = [...trail.slice(0, at + 1), target]
      at = trail.length - 1
      canBack = at > 0
      canForward = false
      loading = true
      clearTimeout(timer)
      timer = setTimeout(() => settle(target), 350)
    }
    report()
  }

  function go(): void {
    navigate(normalizeAddress(address))
  }

  function step(delta: -1 | 1): void {
    if (electron) {
      if (delta < 0) view?.goBack()
      else view?.goForward()
      return
    }
    const next = at + delta
    if (next < 0 || next >= trail.length) return
    at = next
    url = trail[next]
    address = url === BLANK ? '' : url
    canBack = at > 0
    canForward = at < trail.length - 1
    loading = true
    clearTimeout(timer)
    timer = setTimeout(() => settle(url), 250)
    report()
  }

  function refresh(): void {
    if (electron) view?.reload()
    else {
      loading = true
      clearTimeout(timer)
      timer = setTimeout(() => settle(url), 350)
      report()
    }
  }

  function stop(): void {
    if (electron) view?.stop()
    else {
      clearTimeout(timer)
      settle(url)
    }
  }

  // The agent navigates (browser_navigate) or the shell restores the window.
  $effect(() => {
    const incoming = win.view.url
    if (!sync.isExternal({ url: incoming })) return
    untrack(() => {
      if (incoming !== url) navigate(incoming || BLANK)
    })
  })

  // Wire the real <webview>.
  $effect(() => {
    const el = view
    if (!el) return
    const update = (): void => {
      canBack = ready && el.canGoBack()
      canForward = ready && el.canGoForward()
    }
    const onUrl = (event: Event): void => {
      const next = (event as Event & { url?: string }).url
      if (!next) return
      url = next
      address = next
      update()
      report()
    }
    const handlers: [string, (event: Event) => void][] = [
      ['did-start-loading', () => ((loading = true), report())],
      ['did-stop-loading', () => ((loading = false), update(), report())],
      [
        'page-title-updated',
        (event) => {
          title = (event as Event & { title?: string }).title ?? title
          report()
        }
      ],
      ['did-navigate', onUrl],
      ['did-navigate-in-page', onUrl],
      [
        'dom-ready',
        () => {
          ready = true
          update()
          // The backend (desktop.attachBrowser) drives this webContents for the browser_* tools.
          const desktop = host.api.desktop as unknown as { attachBrowser?: (windowId: number, webContentsId: number) => unknown }
          void desktop.attachBrowser?.(win.id, el.getWebContentsId())
        }
      ]
    ]
    for (const [name, handler] of handlers) el.addEventListener(name, handler)
    return () => {
      for (const [name, handler] of handlers) el.removeEventListener(name, handler)
    }
  })

  $effect(() => () => clearTimeout(timer))

  const zone = $derived(url.startsWith('file:') || url === BLANK ? 'Computer' : 'Internet')
  const status = $derived(loading ? `Opening page ${url}...` : 'Done')
</script>

<div class="browser" data-testid="browser-app">
  <div class="chrome">
    <div class="orbs">
      <button class="orb" data-testid="browser-back" aria-label="Back" title="Back" disabled={!canBack} onclick={() => step(-1)}><Icon name="chevron-left" size={16} /></button>
      <button class="orb" data-testid="browser-forward" aria-label="Forward" title="Forward" disabled={!canForward} onclick={() => step(1)}><Icon name="chevron-right" size={16} /></button>
    </div>
    <form
      class="address"
      onsubmit={(event) => {
        event.preventDefault()
        go()
      }}
    >
      <Icon name={isSecure(url) ? 'lock' : 'globe'} />
      <input class="field" data-testid="browser-address" bind:value={address} aria-label="Address" spellcheck="false" placeholder="Type a web address or a search" />
      <button class="mini" data-testid="browser-go" type="submit" aria-label="Go" title="Go to"><Icon name="chevron-right" size={14} /></button>
      {#if loading}
        <button class="mini" type="button" aria-label="Stop" title="Stop" onclick={stop}><Icon name="close" size={14} /></button>
      {:else}
        <button class="mini" type="button" aria-label="Refresh" title="Refresh" onclick={refresh}><Icon name="refresh" size={14} /></button>
      {/if}
    </form>
  </div>
  <div class="tabrow">
    <div class="tab"><Icon name="globe" />{title || (url === BLANK ? 'Blank page' : hostOf(url))}</div>
  </div>
  <div class="page">
    {#if electron}
      <webview bind:this={view} class="webview" src={firstUrl} partition="persist:agent7-browser"></webview>
    {:else}
      <PlaceholderPage {url} {loading} />
    {/if}
  </div>
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text={status} spring />
    <StatusStripLabel borders={['left']} width={230}>
      <Icon name={zone === 'Internet' ? 'globe' : 'shield'} /> <span>{zone} | Protected Mode: On</span>
    </StatusStripLabel>
    <StatusStripLabel text="100%" borders={['left']} width={56} textAlign="right" />
  </StatusStrip>
</div>

<style>
  .browser {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
  }
  .chrome {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 8px;
    background: linear-gradient(#e9f0fa, #cbd9ee);
    border-bottom: 1px solid #8ea4c4;
  }
  .orbs {
    display: flex;
    gap: 2px;
  }
  .orb {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 1px solid #3b5f8f;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 25%, #ffffff 0, #b9d4f3 45%, #4f87cc 100%);
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
  }
  .orb:hover:not(:disabled) {
    background: radial-gradient(circle at 35% 25%, #ffffff 0, #d3eaff 45%, #5aa3ea 100%);
  }
  .orb:disabled {
    opacity: 0.45;
    filter: grayscale(0.6);
  }
  .address {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    padding: 0 3px 0 5px;
    background: var(--w7-window);
    border: 1px solid #7c93b4;
    border-radius: 2px;
  }
  .address:focus-within {
    border-color: #3399ff;
  }
  .field {
    flex: 1;
    min-width: 0;
    height: 20px;
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
    user-select: text;
    cursor: text;
  }
  .mini {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 1px solid transparent;
    background: transparent;
  }
  .mini:hover {
    border-color: var(--w7-toolbar-hover-border);
    background: var(--w7-toolbar-hover-face);
  }
  .tabrow {
    flex: none;
    display: flex;
    align-items: flex-end;
    height: 24px;
    padding: 0 8px;
    background: linear-gradient(#dfe8f5, #cddbee);
  }
  .tab {
    display: flex;
    align-items: center;
    gap: 5px;
    max-width: 220px;
    height: 22px;
    padding: 0 10px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    background: var(--w7-window);
    border: 1px solid #8ea4c4;
    border-bottom: 0;
    border-radius: 3px 3px 0 0;
  }
  .page {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    background: var(--w7-window);
    border-top: 1px solid #8ea4c4;
  }
  .webview {
    flex: 1;
    min-width: 0;
    border: 0;
    display: flex;
  }
</style>
