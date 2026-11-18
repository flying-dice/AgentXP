<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import Balloon from './Balloon.svelte'

  const { Story } = defineMeta({
    title: 'Molecules/Balloon',
    component: Balloon,
    args: { title: 'Project removed', text: "'claude-code-win' (E:) was removed from this desktop. Your files are still in the folder. Double-click it in Computer to plug it in again.", icon: 'usb-safe', onclose: fn(), onhold: fn() },
    argTypes: {
      icon: { control: 'select', options: ['usb-safe', 'info', 'warning'] },
      more: { control: 'text' },
      live: { control: 'boolean' },
      tail: { control: 'number' },
      onclose: { action: 'close' },
      onhold: { action: 'hold' }
    }
  })
</script>

<Story name="SafeToRemove">
  {#snippet template(args)}<div class="stage"><Balloon {...args} /></div>{/snippet}
</Story>

<Story name="Information" args={{ title: 'New chat', text: 'No project is plugged in, so the agent works in its own folder on C:.', icon: 'info' }}>
  {#snippet template(args)}<div class="stage"><Balloon {...args} /></div>{/snippet}
</Story>

<Story name="WithAction" args={{ title: 'Plug in a project', text: 'Open Computer and plug in a project folder, so the agent can work on it.', icon: 'info', action: { label: 'Open Computer', onclick: fn() } }}>
  {#snippet template(args)}<div class="stage"><Balloon {...args} /></div>{/snippet}
</Story>

<Story name="AgentNotice" args={{ title: 'New review comments', text: 'Reviewer left 4 comments on auth.ts', identity: { name: 'Reviewer', color: '#c0612b' }, action: { label: 'Open review', onclick: fn() } }}>
  {#snippet template(args)}<div class="stage"><Balloon {...args} /></div>{/snippet}
</Story>

<Story name="QueuedNotices" args={{ title: 'Chat finished', text: 'Builder finished: changed 6 files, ran tests (passed)', identity: { name: 'Builder', color: '#2e9a5f' }, action: { label: 'Review changes', onclick: fn() }, more: '2 more' }}>
  {#snippet template(args)}<div class="stage"><Balloon {...args} /></div>{/snippet}
</Story>

<Story name="StoppedWithError" args={{ title: 'Chat stopped', text: 'Builder stopped with an error: The agent stopped unexpectedly. It changed 2 files.', identity: { name: 'Builder', color: '#2e9a5f' }, action: { label: 'Open chat', onclick: fn() } }}>
  {#snippet template(args)}<div class="stage"><Balloon {...args} /></div>{/snippet}
</Story>

<Story name="ShowRequest" args={{ title: 'Show request', text: 'Reviewer wants to show you auth.ts:40-62: The token is checked after it expired', identity: { name: 'Reviewer', color: '#c0612b' }, action: { label: 'Show', onclick: fn() }, secondary: { label: 'Not now', onclick: fn() } }}>
  {#snippet template(args)}<div class="stage"><Balloon {...args} /></div>{/snippet}
</Story>

<style>
  .stage {
    padding: 24px 24px 40px;
    background: var(--xp-desktop-bg);
  }
</style>
