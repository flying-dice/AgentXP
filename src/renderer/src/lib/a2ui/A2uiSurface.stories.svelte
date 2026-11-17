<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import A2uiSurface from './A2uiSurface.svelte'
  import UnknownComponent from './components/UnknownComponent.svelte'
  import { codeReview, controls, projectOverview, settingsForm, streamingBatches, testResults } from './A2uiSurface.fixtures'

  const { Story } = defineMeta({
    title: 'A2UI/Surface',
    component: A2uiSurface,
    args: { onaction: fn(), sessionId: 1 },
    argTypes: {
      messages: { control: 'object' },
      sessionId: { control: 'number' },
      onaction: { action: 'action' }
    },
    parameters: {
      docs: {
        description: {
          component:
            'Renders the replayable A2UI v0.9 messages of one surface through @a2ui/web_core (MessageProcessor, NodeResolver, signals) and the WinForms kit. Triggered actions are reported through `onaction` as an `A2uiClientEvent` and shown below each surface.'
        }
      }
    }
  })
</script>

<script lang="ts">
  import type { A2uiClientEvent } from '@shared/a2ui'

  let last = $state<Record<string, A2uiClientEvent | undefined>>({})
  let batches = $state(1)
  const streamed = $derived(streamingBatches.slice(0, batches).flat())
</script>

{#snippet frame(id: string, title: string, args: { messages: unknown; onaction?: (e: A2uiClientEvent) => void; sessionId?: number }, messages: typeof settingsForm, width: number)}
  <div class="window" style:width="{width}px">
    <div class="caption">{title}</div>
    <div class="client">
      <A2uiSurface
        {messages}
        sessionId={args.sessionId}
        onaction={(event) => {
          last[id] = event
          args.onaction?.(event)
        }}
      />
    </div>
  </div>
  <p class="log-title">Last action sent to the agent:</p>
  <pre class="log">{last[id] ? JSON.stringify(last[id], null, 2) : 'none yet'}</pre>
{/snippet}

<Story name="SettingsForm" parameters={{ controls: { disable: true } }}>
  {#snippet template(args)}
    {@render frame('settings', 'Connection settings', args, settingsForm, 460)}
  {/snippet}
</Story>

<Story name="TestResults" parameters={{ controls: { disable: true } }}>
  {#snippet template(args)}
    {@render frame('tests', 'Test run: 6 tests', args, testResults, 520)}
  {/snippet}
</Story>

<Story name="CodeReview" parameters={{ controls: { disable: true } }}>
  {#snippet template(args)}
    {@render frame('review', 'Review: replace hand-rolled message types', args, codeReview, 640)}
  {/snippet}
</Story>

<Story name="ProjectOverview" parameters={{ controls: { disable: true } }}>
  {#snippet template(args)}
    {@render frame('overview', 'Project overview', args, projectOverview, 520)}
  {/snippet}
</Story>

<Story name="MoreControls" parameters={{ controls: { disable: true } }}>
  {#snippet template(args)}
    {@render frame('controls', 'More controls', args, controls, 520)}
  {/snippet}
</Story>

<Story name="Streaming" parameters={{ controls: { disable: true } }}>
  {#snippet template(args)}
    <p class="log-title">Message batches sent so far: {batches} of {streamingBatches.length}</p>
    <button type="button" disabled={batches >= streamingBatches.length} onclick={() => (batches += 1)}>Send next batch</button>
    <button type="button" onclick={() => (batches = 1)}>Restart</button>
    {@render frame('stream', 'Build progress', args, streamed, 380)}
  {/snippet}
</Story>

<Story name="UnknownComponentFallback" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <UnknownComponent name="Gauge" />
  {/snippet}
</Story>

<style>
  .window {
    border: 1px solid #5a6a84;
    background: var(--xp-face);
    box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.3);
  }
  .caption {
    padding: 4px 8px;
    color: #000;
    font: var(--xp-font);
    background: linear-gradient(#dbe8f7, #bcd2ee 50%, #aac4e6 51%, #c1d6f0);
    border-bottom: 1px solid #7e94b8;
  }
  .client {
    padding: 10px;
  }
  .log-title {
    margin: 10px 0 2px;
    font: var(--xp-font);
    color: var(--xp-text-muted);
  }
  .log {
    max-width: 640px;
    max-height: 140px;
    overflow: auto;
    margin: 0;
    padding: 4px 6px;
    border: 1px solid var(--xp-input-border);
    background: var(--xp-window);
    font: var(--xp-font-mono);
    user-select: text;
  }
</style>
