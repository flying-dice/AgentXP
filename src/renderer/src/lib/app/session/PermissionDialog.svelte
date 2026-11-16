<script lang="ts">
  import type { AguiToolCallState } from '@shared/agui-state'
  import type { PermissionOptionDto } from '@shared/models'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import MessageIcon from '../../kit/molecules/MessageIcon.svelte'
  import CodeViewer from '../../kit/organisms/CodeViewer.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import DiffViewer from '../../kit/organisms/DiffViewer.svelte'
  import CommandLink from './CommandLink.svelte'
  import { asPredicate, canRemember, captionFor, optionFor, type PermissionDecision } from './permissionOptions'
  import { toolArgument } from './toolSummary'

  interface Props {
    agentName: string
    /** The request's title, e.g. "Edit src/auth/redirect.ts" or "Run npm test". */
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
  const argument = $derived(
    toolCall ? toolArgument(toolCall.kind, toolCall.rawInput, toolCall.locations, toolCall.title) : ''
  )
  const rememberable = $derived(canRemember(options))
  const language = $derived(toolCall?.kind === 'execute' ? 'bash' : 'text')

  function decide(decision: PermissionDecision): void {
    onanswer?.(optionFor(options, decision, remember && rememberable)?.optionId ?? null)
  }
</script>

<Dialog testid="permission-dialog" title={agentName} width="560px" iconName="shield" {contained} bodyColor="window" onclose={() => onanswer?.(null)} role="alertdialog">
  <div class="body">
    <MessageIcon kind="shield" size={40} />
    <div class="main">
      <div class="question">Allow {agentName} to {asPredicate(title)}?</div>
      {#if diff?.kind === 'diff'}
        <div class="detail">
          <DiffViewer oldText={diff.oldText ?? ''} newText={diff.newText} fileName={diff.path} toolbar={false} maxHeight="220px" />
        </div>
      {:else if argument}
        <div class="detail">
          <CodeViewer code={argument} {language} wordWrap maxHeight="140px" label="Arguments" />
        </div>
      {/if}
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
  .detail {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
  }
  .links {
    padding: 8px 10px 6px;
    background: var(--w7-window);
  }
</style>
