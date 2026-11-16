<script lang="ts">
  /**
   * Story harness: one app inside a plain kit Form frame sized like a window, backed by a fake
   * host. `agentButtons` adds a strip that plays the agent changing the window's view.
   */
  import type { Snippet } from 'svelte'
  import type { Message } from '@ag-ui/core'
  import type { AppKind, AppView } from '@shared/desktop'
  import type { AguiSessionState } from '@shared/agui-state'
  import { onMount } from 'svelte'
  import Button from '../kit/atoms/Button.svelte'
  import { handleAppRequest } from './appRequests'
  import Form from '../kit/organisms/Form.svelte'
  import MessageBoxHost from '../kit/organisms/MessageBoxHost.svelte'
  import { appRegistry } from './registry'
  import { StoryHost, storyViews } from './storyHost.svelte'

  interface Props {
    app: AppKind
    view?: AppView
    width?: number
    height?: number
    active?: boolean
    /** Buttons that make the agent change the view of this window. */
    agent?: { label: string; view: AppView }[]
    /** Called with the host and window id before the first render (extra windows, fake state). */
    setup?: (host: StoryHost) => void
    /** Shared AG-UI state of every chat (default: the sample session). */
    aguiState?: () => AguiSessionState
    /** AG-UI messages every chat of the story shows (default: the sample transcript). */
    aguiMessages?: () => Message[]
    /** Buttons that send an app request to the window (what the agent's tools do). */
    requests?: { label: string; method: string; params?: unknown }[]
    /** App requests sent once after the window mounted (a ready-made picture, for screenshots). */
    run?: { method: string; params?: unknown }[]
    extra?: Snippet<[StoryHost]>
  }

  let { app, view, width = 760, height = 500, active = true, agent = [], requests = [], run = [], setup, aguiState, aguiMessages, extra }: Props = $props()

  // One host per mount: the props are deliberately read once.
  // svelte-ignore state_referenced_locally
  const host = new StoryHost({ state: aguiState, messages: aguiMessages })
  // svelte-ignore state_referenced_locally
  setup?.(host)
  // svelte-ignore state_referenced_locally
  const opened = host.open({ app }, view ?? (storyViews[app] as AppView | undefined))
  const windowState = $derived(host.byId(opened.id))
  const definition = $derived(appRegistry[app])
  const Component = $derived(definition.component)
  const send = (r: { method: string; params?: unknown }): Promise<unknown> => handleAppRequest({ requestId: `story-${r.method}`, desktopId: host.state.desktopId, windowId: opened.id, method: r.method, params: r.params })
  onMount(() => {
    const timer = setTimeout(async () => {
      for (const r of run) await send(r)
    }, 60)
    return () => clearTimeout(timer)
  })
</script>

<div class="stage">
  <Form title={windowState.title} iconName={definition.icon} {active} width="{width}px" height="{height}px" sizeGrip={false}>
    <div class="client">
      <Component window={windowState} {host} focused={active} />
    </div>
  </Form>
  {#if agent.length > 0 || requests.length > 0 || extra}
    <div class="agent">
      <b>Agent:</b>
      {#each agent as a (a.label)}
        <Button onclick={() => host.agentSetsView(opened.id, a.view)}>{a.label}</Button>
      {/each}
      {#each requests as r (r.label)}
        <Button onclick={() => void send(r)}>{r.label}</Button>
      {/each}
      {@render extra?.(host)}
    </div>
  {/if}
  <MessageBoxHost />
</div>

<style>
  .stage {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  .client {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .agent {
    display: flex;
    align-items: center;
    gap: 6px;
  }
</style>
