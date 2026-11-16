<script lang="ts">
  /**
   * One tab of the Browser app: its own `<webview>` (Electron) or a static preview (Storybook), with its own history.
   * The app calls the exported functions and listens to `onpatch`.
   */
  import { BLANK, hostOf } from './address'
  import PlaceholderPage from './PlaceholderPage.svelte'
  import type { BrowserTabState } from './tabs'
  import type { PageContext, WebviewElement } from './webview'

  interface Props {
    /** The address the tab opens with. */
    initialUrl: string
    electron: boolean
    active: boolean
    testId: string
    onpatch: (patch: Partial<BrowserTabState>) => void
    /** The guest page is ready; `webContentsId` is what main drives (0 outside Electron). */
    onready: (webContentsId: number) => void
    /** Right-click inside the guest page (which swallows it): where, and what was under the pointer. */
    oncontext?: (info: PageContext) => void
  }

  let { initialUrl, electron, active, testId, onpatch, onready, oncontext }: Props = $props()

  // The webview opens with this address once; later changes go through navigate() (a reactive src would reload the page).
  // svelte-ignore state_referenced_locally
  const firstUrl = initialUrl
  let url = $state(firstUrl)
  let loading = $state(false)
  let view = $state<WebviewElement | null>(null)
  let ready = false
  // svelte-ignore state_referenced_locally
  let trail = $state.raw<string[]>([initialUrl])
  let at = $state(0)
  let timer: ReturnType<typeof setTimeout> | undefined

  function history(): { canBack: boolean; canForward: boolean } {
    if (!electron) return { canBack: at > 0, canForward: at < trail.length - 1 }
    return { canBack: ready && !!view?.canGoBack(), canForward: ready && !!view?.canGoForward() }
  }

  function report(patch: Partial<BrowserTabState> = {}): void {
    onpatch({ url, loading, ...history(), ...patch })
  }

  function settle(target: string): void {
    loading = false
    report({ title: target === BLANK ? '' : hostOf(target) })
  }

  export function navigate(target: string): void {
    url = target
    loading = true
    if (electron) {
      if (view && ready) void view.loadURL(target).catch(() => {})
      else if (view) view.src = target
    } else {
      trail = [...trail.slice(0, at + 1), target]
      at = trail.length - 1
      clearTimeout(timer)
      timer = setTimeout(() => settle(target), 350)
    }
    report()
  }

  export function step(delta: -1 | 1): void {
    if (electron) {
      if (delta < 0) view?.goBack()
      else view?.goForward()
      return
    }
    const next = at + delta
    if (next < 0 || next >= trail.length) return
    at = next
    url = trail[next]
    loading = true
    clearTimeout(timer)
    timer = setTimeout(() => settle(url), 250)
    report()
  }

  export function reload(): void {
    if (electron) view?.reload()
    else {
      loading = true
      clearTimeout(timer)
      timer = setTimeout(() => settle(url), 350)
      report()
    }
  }

  export function stop(): void {
    if (electron) view?.stop()
    else {
      clearTimeout(timer)
      settle(url)
    }
  }

  // Outside Electron the tab settles by itself after it opens.
  $effect(() => {
    if (electron) return
    loading = initialUrl !== BLANK
    timer = setTimeout(() => settle(url), 250)
    return () => clearTimeout(timer)
  })

  // Wire the real <webview>.
  $effect(() => {
    const el = view
    if (!el) return
    const onUrl = (event: Event): void => {
      const next = (event as Event & { url?: string }).url
      if (!next) return
      url = next
      report()
    }
    const onContext = (event: Event): void => {
      const params = (event as Event & { params?: { x: number; y: number; linkURL?: string; selectionText?: string } }).params
      if (!params) return
      const box = el.getBoundingClientRect()
      oncontext?.({ x: box.left + params.x, y: box.top + params.y, linkURL: params.linkURL ?? '', selectionText: params.selectionText ?? '' })
    }
    const handlers: [string, (event: Event) => void][] = [
      ['context-menu', onContext],
      ['did-start-loading', () => ((loading = true), report())],
      ['did-stop-loading', () => ((loading = false), report())],
      ['page-title-updated', (event) => report({ title: (event as Event & { title?: string }).title ?? '' })],
      ['did-navigate', onUrl],
      ['did-navigate-in-page', onUrl],
      [
        'dom-ready',
        () => {
          ready = true
          report()
          onready(el.getWebContentsId())
        }
      ]
    ]
    for (const [name, handler] of handlers) el.addEventListener(name, handler)
    return () => {
      for (const [name, handler] of handlers) el.removeEventListener(name, handler)
    }
  })

  $effect(() => {
    if (!electron) onready(0)
  })
</script>

<div class="tabpage" class:hidden={!active} data-testid={testId} data-active={active}>
  {#if electron}
    <webview bind:this={view} class="webview" src={firstUrl} partition="persist:agent7-browser"></webview>
  {:else}
    <PlaceholderPage {url} {loading} />
  {/if}
</div>

<style>
  .tabpage {
    flex: 1;
    min-width: 0;
    display: flex;
  }
  .tabpage.hidden {
    display: none;
  }
  .webview {
    flex: 1;
    min-width: 0;
    border: 0;
    display: flex;
  }
</style>
