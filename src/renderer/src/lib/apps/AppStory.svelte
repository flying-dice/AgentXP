<script lang="ts">
  /**
   * Story harness: one app inside a plain kit Form frame sized like a window, backed by a fake
   * host. `agentButtons` adds a strip that plays the agent changing the window's view.
   */
  import type { Snippet } from 'svelte'
  import type { AppKind, AppView } from '@shared/desktop'
  import type { AguiSessionState } from '@shared/agui-state'
  import Button from '../kit/atoms/Button.svelte'
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
    extra?: Snippet
  }

  let { app, view, width = 760, height = 500, active = true, agent = [], setup, aguiState, extra }: Props = $props()

  // One host per mount: the props are deliberately read once.
  // svelte-ignore state_referenced_locally
  const host = new StoryHost({ state: aguiState })
  // svelte-ignore state_referenced_locally
  setup?.(host)
  // svelte-ignore state_referenced_locally
  const opened = host.open({ app }, view ?? (storyViews[app] as AppView | undefined))
  const windowState = $derived(host.byId(opened.id))
  const definition = $derived(appRegistry[app])
  const Component = $derived(definition.component)
</script>

<div class="stage">
  <Form title={windowState.title} iconName={definition.icon} {active} width="{width}px" height="{height}px" sizeGrip={false}>
    <div class="client">
      <Component window={windowState} {host} focused={active} />
    </div>
  </Form>
  {#if agent.length > 0 || extra}
    <div class="agent">
      <b>Agent:</b>
      {#each agent as a (a.label)}
        <Button onclick={() => host.agentSetsView(opened.id, a.view)}>{a.label}</Button>
      {/each}
      {@render extra?.()}
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
