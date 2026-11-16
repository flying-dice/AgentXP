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
  }

  let { messages, sessionId, onaction, running }: Props = $props()

  const title = $derived.by(() => {
    for (const m of messages) if ('createSurface' in m) return m.createSurface.theme?.title ?? ''
    return ''
  })
</script>

<GroupBox text={title}>
  <A2uiSurface {messages} {sessionId} {onaction} busy={running} />
</GroupBox>
