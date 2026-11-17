<script lang="ts">
  import type { A2uiClientEvent, A2uiServerMessage } from '@shared/a2ui'
  import A2uiSurface from '../../a2ui/A2uiSurface.svelte'
  import GroupBox from '../../kit/atoms/GroupBox.svelte'

  interface Props {
    messages: readonly A2uiServerMessage[]
    sessionId: number
    onaction?: (event: A2uiClientEvent) => void
    /** True while the agent works on a turn (the form says "Sending..." then "Sent."). */
    running?: boolean
    /** The agent's latest reply as plain text; the form quotes it after Send ("Sent. The agent answered: ..."). */
    reply?: string
  }

  let { messages, sessionId, onaction, running, reply }: Props = $props()

  const title = $derived.by(() => {
    for (const m of messages) if ('createSurface' in m) return m.createSurface.theme?.title ?? ''
    return ''
  })
</script>

<!-- The surface paints the window face (Panel), the transcript is white: one face-coloured frame keeps the box filled. -->
<div class="frame">
  <GroupBox text={title}>
    <A2uiSurface {messages} {sessionId} {onaction} busy={running} {reply} />
  </GroupBox>
</div>

<style>
  .frame {
    padding: 6px;
    border-radius: 3px;
    background: var(--xp-face);
  }
</style>
