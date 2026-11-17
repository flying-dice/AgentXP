<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AgentCursor from './AgentCursor.svelte'

  const { Story } = defineMeta({
    title: 'Organisms/AgentCursor',
    component: AgentCursor,
    args: { name: 'Builder', color: '#2e9a5f', x: 60, y: 40, state: 'arrived', reducedMotion: false, glideMs: 300, pulse: true },
    argTypes: {
      name: { control: 'text' },
      color: { control: 'color' },
      x: { control: { type: 'range', min: 0, max: 360, step: 10 } },
      y: { control: { type: 'range', min: 0, max: 160, step: 10 } },
      state: { control: 'select', options: ['ready', 'gliding', 'arrived', 'idle', 'cancelled', 'hidden'] },
      reducedMotion: { control: 'boolean' },
      glideMs: { control: 'number' },
      pulse: { control: 'boolean' }
    }
  })
</script>

<script lang="ts">
  let at = $state({ x: 40, y: 30 })
  let cursorState = $state<'gliding' | 'arrived'>('arrived')
  /** Click on the stage: the cursor glides there (or jumps, with reduced motion). */
  function move(event: MouseEvent, reduced: boolean): void {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
    at = { x: Math.round(event.clientX - box.left), y: Math.round(event.clientY - box.top) }
    cursorState = 'gliding'
    setTimeout(() => (cursorState = 'arrived'), reduced ? 0 : 300)
  }
</script>

<Story name="Default">
  {#snippet template(args)}<div class="stage"><AgentCursor {...args} /></div>{/snippet}
</Story>

<Story name="SeveralIdentities">
  {#snippet template()}
    <div class="stage">
      <AgentCursor name="Builder" color="#2e9a5f" x={30} y={20} />
      <AgentCursor name="Reviewer" color="#c0612b" x={150} y={60} />
      <AgentCursor name="Claude Code" color="#3a6fd8" x={260} y={100} />
    </div>
  {/snippet}
</Story>

<Story name="Glide">
  {#snippet template(args)}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="stage" onclick={(e) => move(e, false)}><AgentCursor {...args} x={at.x} y={at.y} state={cursorState} /><p>Click to move the cursor.</p></div>
  {/snippet}
</Story>

<Story name="ReducedMotion" args={{ reducedMotion: true }}>
  {#snippet template(args)}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="stage" onclick={(e) => move(e, true)}><AgentCursor {...args} x={at.x} y={at.y} state={cursorState} /><p>Click: the cursor jumps and pulses.</p></div>
  {/snippet}
</Story>

<Story name="Faded" args={{ state: 'idle' }}>
  {#snippet template(args)}<div class="stage"><AgentCursor {...args} /><p>Faded after 1.5 s idle.</p></div>{/snippet}
</Story>

<style>
  .stage {
    position: relative;
    width: 400px;
    height: 180px;
    border: 1px solid var(--xp-tab-border);
    background: var(--xp-face);
    font: var(--xp-font);
  }
  p {
    position: absolute;
    bottom: 4px;
    left: 8px;
    margin: 0;
    color: var(--xp-text-muted);
  }
</style>
