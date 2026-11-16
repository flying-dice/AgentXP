<script lang="ts">
  import type { AguiToolCallState } from '@shared/agui-state'
  import type { PermissionOptionDto } from '@shared/models'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import MessageIcon from '../../kit/molecules/MessageIcon.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import ApprovalDetail from './ApprovalDetail.svelte'
  import CommandLink from './CommandLink.svelte'
  import { AltHeld, moveBetweenAnswers } from './answerKeys.svelte'
  import { KEY_HINT, accessKeyIndex, canRemember, captionFor, decisionForKey, optionFor, type PermissionDecision } from './permissionOptions'
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

  const alt = new AltHeld()
  let keys = $state<HTMLElement | null>(null)

  function decide(decision: PermissionDecision): void {
    onanswer?.(optionFor(options, decision, remember && rememberable)?.optionId ?? null)
  }

  /** Alt+A allows and Alt+D denies from anywhere in the dialog; Left and Right move between the two answers. */
  function onkeydown(event: KeyboardEvent): void {
    // Several chat windows can each show a dialog: only the keys pressed inside this one count.
    const box = keys?.closest('[data-testid="permission-dialog"]')
    if (!box || !(event.target instanceof Node) || !box.contains(event.target)) return
    alt.keydown(event)
    const decision = decisionForKey(event)
    if (decision) {
      event.preventDefault()
      event.stopPropagation()
      decide(decision)
    } else moveBetweenAnswers(event)
  }
</script>

<svelte:window onkeydown={onkeydown} onkeyup={alt.keyup} onblur={alt.reset} />

<Dialog testid="permission-dialog" title={agentName} width="560px" iconName="shield" {contained} bodyColor="window" onclose={() => onanswer?.(null)} role="alertdialog">
  <div class="body" bind:this={keys}>
    <MessageIcon kind="shield" size={40} />
    <div class="main">
      <div class="question" data-testid="permission-question">{question}</div>
      <ApprovalDetail {toolCall} testid="permission" />
    </div>
  </div>
  <div class="links" data-answers role="group" aria-label="Your answer">
    <CommandLink
      kind="allow"
      testid="permission-option-{optionFor(options, 'allow', remember && rememberable)?.optionId ?? 'allow'}"
      title={captionFor(options, 'allow', remember && rememberable)}
      keyIndex={accessKeyIndex(captionFor(options, 'allow', remember && rememberable), 'allow')}
      showKey={alt.held}
      description="{agentName} goes ahead, then keeps working."
      onclick={() => decide('allow')}
    />
    <CommandLink
      kind="deny"
      autofocus
      testid="permission-option-{optionFor(options, 'deny', remember && rememberable)?.optionId ?? 'deny'}"
      title={captionFor(options, 'deny', remember && rememberable)}
      keyIndex={accessKeyIndex(captionFor(options, 'deny', remember && rememberable), 'deny')}
      showKey={alt.held}
      description="Nothing changes. You can tell {agentName} what to do instead."
      onclick={() => decide('deny')}
    />
    <p class="hint" data-testid="permission-hint">{KEY_HINT}</p>
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
  .hint {
    margin: 6px 0 0 2px;
    font-size: 12px;
    color: var(--w7-text-muted);
  }
</style>
