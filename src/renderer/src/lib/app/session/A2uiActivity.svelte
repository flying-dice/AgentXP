<script lang="ts">
  import type { A2uiClientEvent, A2uiServerMessage } from '@shared/a2ui'
  import A2uiSurface from '../../a2ui/A2uiSurface.svelte'
  import GroupBox from '../../kit/atoms/GroupBox.svelte'

  interface Props {
    messages: readonly A2uiServerMessage[]
    sessionId: number
    onaction?: (event: A2uiClientEvent) => void
  }

  let { messages, sessionId, onaction }: Props = $props()

  const title = $derived.by(() => {
    for (const m of messages) if ('createSurface' in m) return m.createSurface.theme?.title ?? ''
    return ''
  })
</script>

<!-- The surface paints the window face (Panel), the transcript is white: one face-coloured frame keeps the box filled. -->
<div class="frame">
  <GroupBox text={title}>
    <A2uiSurface {messages} {sessionId} {onaction} />
  </GroupBox>
</div>

<style>
  .frame {
    padding: 6px;
    border-radius: 3px;
    background: var(--w7-face);
  }
</style>
