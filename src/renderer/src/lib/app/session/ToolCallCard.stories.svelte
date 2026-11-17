<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import type { ComponentProps } from 'svelte'
  import ToolCallCard from './ToolCallCard.svelte'
  import { toolStatusView } from './toolStatus'

  const { Story } = defineMeta({
    title: 'App/Session/ToolCallCard',
    component: ToolCallCard,
    args: { name: 'Read', argument: 'src/auth/redirect.ts', status: toolStatusView('completed'), expandable: true, open: false },
    argTypes: { name: { control: 'text' }, argument: { control: 'text' }, expandable: { control: 'boolean' }, open: { control: 'boolean' } }
  })
</script>

{#snippet card(args: ComponentProps<typeof ToolCallCard>)}
  <div style="width:560px;padding:8px;background:#fff">
    <ToolCallCard {...args}>
      <pre style="margin:0;padding:6px 8px;font:var(--xp-font-mono)">export async function handleSignIn(req, res) {'{'}
  res.redirect('/home')
{'}'}</pre>
    </ToolCallCard>
  </div>
{/snippet}

<Story name="Done">{#snippet template(args)}{@render card(args)}{/snippet}</Story>
<Story name="DoneOpen" args={{ open: true }}>{#snippet template(args)}{@render card(args)}{/snippet}</Story>
<Story name="Running" args={{ name: 'Bash', argument: 'npm run build', status: toolStatusView('in_progress'), expandable: false }}>{#snippet template(args)}{@render card(args)}{/snippet}</Story>
<Story name="WaitingForPermission" args={{ name: 'Edit', argument: 'src/auth/redirect.ts', status: toolStatusView('pending', true), expandable: false }}>{#snippet template(args)}{@render card(args)}{/snippet}</Story>
<Story name="Failed" args={{ name: 'Edit', argument: 'src/auth/session.ts', status: toolStatusView('failed'), expandable: false }}>{#snippet template(args)}{@render card(args)}{/snippet}</Story>
<Story name="Cancelled" args={{ name: 'Bash', argument: 'npm run e2e', status: toolStatusView('cancelled'), expandable: false }}>{#snippet template(args)}{@render card(args)}{/snippet}</Story>
