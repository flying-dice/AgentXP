<script lang="ts">
  import type { AguiToolCallState } from '@shared/agui-state'
  import type { PermissionOptionDto } from '@shared/models'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import MessageIcon from '../../kit/molecules/MessageIcon.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import ApprovalDetail from './ApprovalDetail.svelte'
  import CommandLink from './CommandLink.svelte'
  import { canRemember, captionFor, optionFor, type PermissionDecision } from './permissionOptions'
  import { approvalTitle } from './toolTitles'

  interface Props {
    agentName: string
    /** The agent's own title for the request, e.g. "Edit src/auth/redirect.ts" or "Run npm test". The dialog words it plainly. */
    title: string
    options: readonly PermissionOptionDto[]
    /** The tool call asking for permission, for its diff or command. */
    toolCall?: AguiToolCallState
    /** The chosen option id, or null when the dialog was dismissed (Esc / close box). */
    onanswer?: (optionId: string | null) => void
    /** Cover the nearest positioned ancestor (a desktop window) instead of the viewport. */
    contained?: boolean
  }

  let { agentName, title, options, toolCall, onanswer, contained = false }: Props = $props()

  let remember = $state(false)

  const diff = $derived(toolCall?.contents.find((c) => c.kind === 'diff'))
  const question = $derived(approvalTitle({ title, toolKind: toolCall?.kind ?? null, path: (diff?.kind === 'diff' ? diff.path : toolCall?.locations[0]?.path) ?? null }, agentName))
  const rememberable = $derived(canRemember(options))

  function decide(decision: PermissionDecision): void {
    onanswer?.(optionFor(options, decision, remember && rememberable)?.optionId ?? null)
  }
</script>

<Dialog testid="permission-dialog" title={agentName} width="560px" iconName="shield" {contained} bodyColor="window" onclose={() => onanswer?.(null)} role="alertdialog">
  <div class="body">
    <MessageIcon kind="shield" size={40} />
    <div class="main">
      <div class="question" data-testid="permission-question">{question}</div>
      <ApprovalDetail {toolCall} testid="permission" />
    </div>
  </div>
  <div class="links">
    <CommandLink
      kind="allow"
      testid="permission-option-{optionFor(options, 'allow', remember && rememberable)?.optionId ?? 'allow'}"
      title={captionFor(options, 'allow', remember && rememberable)}
      description="{agentName} goes ahead, then keeps working."
      onclick={() => decide('allow')}
    />
    <CommandLink
      kind="deny"
      autofocus
      testid="permission-option-{optionFor(options, 'deny', remember && rememberable)?.optionId ?? 'deny'}"
      title={captionFor(options, 'deny', remember && rememberable)}
      description="Nothing changes. You can tell {agentName} what to do instead."
      onclick={() => decide('deny')}
    />
  </div>
  {#snippet buttons()}
    {#if rememberable}
      <CheckBox testid="permission-remember" bind:checked={remember} label="Don't ask again for this kind of action" />
    {/if}
  {/snippet}
</Dialog>

<style>
  .body {
    display: flex;
    gap: 14px;
    padding: 18px 18px 16px;
    background: var(--w7-window);
  }
  .main {
    flex: 1;
    min-width: 0;
  }
  .question {
    font-size: 17px;
    line-height: 1.25;
    color: #003399;
    overflow-wrap: anywhere;
  }
  .links {
    padding: 8px 10px 6px;
    background: var(--w7-window);
  }
</style>
