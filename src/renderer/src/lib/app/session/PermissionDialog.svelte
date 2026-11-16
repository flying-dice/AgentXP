<script lang="ts">
  import type { AguiToolCallState } from '@shared/agui-state'
  import type { PermissionOptionDto } from '@shared/models'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import MessageIcon from '../../kit/molecules/MessageIcon.svelte'
  import ApprovalDetail from './ApprovalDetail.svelte'
  import CommandLink from './CommandLink.svelte'
  import { AltHeld, moveBetweenAnswers } from './answerKeys.svelte'
  import { KEY_HINT, accessKeyIndex, canRemember, captionFor, decisionForKey, optionFor, type PermissionDecision } from './permissionOptions'
  import { approvalTitle } from './toolTitles'

  interface Props {
    agentName: string
    /** The agent's own title for the request, e.g. "Edit src/auth/redirect.ts" or "Run npm test". The box words it plainly. */
    title: string
    options: readonly PermissionOptionDto[]
    /** The tool call asking for permission, for its diff or command. */
    toolCall?: AguiToolCallState
    /** The chosen option id, or null when the request was dismissed (Esc). */
    onanswer?: (optionId: string | null) => void
    /** "1 of 2 waiting" when more than one request waits on the desktop; null when this is the only one. */
    queueText?: string | null
  }

  let { agentName, title, options, toolCall, onanswer, queueText = null }: Props = $props()

  let remember = $state(false)

  const diff = $derived(toolCall?.contents.find((c) => c.kind === 'diff'))
  const question = $derived(approvalTitle({ title, toolKind: toolCall?.kind ?? null, path: (diff?.kind === 'diff' ? diff.path : toolCall?.locations[0]?.path) ?? null }, agentName))
  const rememberable = $derived(canRemember(options))

  const alt = new AltHeld()
  let box = $state<HTMLElement | null>(null)

  function decide(decision: PermissionDecision): void {
    onanswer?.(optionFor(options, decision, remember && rememberable)?.optionId ?? null)
  }

  /** The first focus is on Deny, the safe answer: Enter denies. The box does not trap the focus: the transcript above stays readable. */
  function focusDeny(node: HTMLElement): void {
    queueMicrotask(() => node.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true }))
  }

  /** A allows, Alt+A allows and Alt+D denies from anywhere in the box; Left and Right move between the two answers. */
  function onkeydown(event: KeyboardEvent): void {
    // Several chat windows can each show a box: only the keys pressed inside this one count.
    if (!box || !(event.target instanceof Node) || !box.contains(event.target)) return
    alt.keydown(event)
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onanswer?.(null)
      return
    }
    const decision = decisionForKey(event)
    if (decision) {
      event.preventDefault()
      event.stopPropagation()
      decide(decision)
    } else moveBetweenAnswers(event)
  }
</script>

<svelte:window onkeydown={onkeydown} onkeyup={alt.keyup} onblur={alt.reset} />

<!-- Part of the chat layout, above the message box: it scrolls inside its own height and never covers the transcript. Allow and Deny stay in view. -->
<section class="permission" bind:this={box} use:focusDeny role="alertdialog" aria-label={question} data-testid="permission-dialog">
  <div class="scroll">
    <div class="body">
      <MessageIcon kind="shield" size={32} />
      <div class="main">
        {#if queueText}<div class="queue" data-testid="permission-queue">{queueText}</div>{/if}
        <div class="question" data-testid="permission-question">{question}</div>
        <ApprovalDetail {toolCall} testid="permission" />
      </div>
    </div>
  </div>
  <div class="actions" data-answers role="group" aria-label="Your answer">
    <CommandLink
      kind="allow"
      compact
      testid="permission-option-{optionFor(options, 'allow', remember && rememberable)?.optionId ?? 'allow'}"
      title={captionFor(options, 'allow', remember && rememberable)}
      keyIndex={accessKeyIndex(captionFor(options, 'allow', remember && rememberable), 'allow')}
      showKey={alt.held}
      description="{agentName} goes ahead, then keeps working."
      onclick={() => decide('allow')}
    />
    <CommandLink
      kind="deny"
      compact
      autofocus
      testid="permission-option-{optionFor(options, 'deny', remember && rememberable)?.optionId ?? 'deny'}"
      title={captionFor(options, 'deny', remember && rememberable)}
      keyIndex={accessKeyIndex(captionFor(options, 'deny', remember && rememberable), 'deny')}
      showKey={alt.held}
      description="Nothing changes. You can tell {agentName} what to do instead."
      onclick={() => decide('deny')}
    />
    <p class="hint" data-testid="permission-hint">{KEY_HINT}</p>
    {#if rememberable}
      <span class="remember"><CheckBox testid="permission-remember" bind:checked={remember} label="Don't ask again for this kind of action" /></span>
    {/if}
  </div>
</section>

<style>
  .permission {
    flex: none;
    display: flex;
    flex-direction: column;
    min-height: 0;
    /* A part of the chat's height: the request scrolls inside, the two answers stay in the window. */
    max-height: 40%;
    margin-top: 4px;
    border: 1px solid #1c3a64;
    background: var(--w7-window);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.6) inset;
  }
  .scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }
  .body {
    display: flex;
    gap: 10px;
    padding: 8px 10px 4px;
  }
  .main {
    flex: 1;
    min-width: 0;
  }
  .queue {
    margin-bottom: 2px;
    color: var(--w7-text-muted);
    font-size: 12px;
  }
  .question {
    font-size: 15px;
    line-height: 1.25;
    color: #003399;
    overflow-wrap: anywhere;
  }
  .actions {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
    padding: 4px 10px 6px;
    border-top: 1px solid #dfe6ee;
    background: var(--w7-window);
  }
  .hint {
    margin: 0;
    font-size: 12px;
    color: var(--w7-text-muted);
  }
  .remember {
    flex-basis: 100%;
  }
</style>
