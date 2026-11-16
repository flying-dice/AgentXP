<script lang="ts">
  import MessageBox from './MessageBox.svelte'
  import { messageBoxes as defaultService, type MessageBoxService, type PendingMessageBox } from './messageBox'

  interface Props {
    /** Service to display; defaults to the app-wide one used by `showMessageBox`. */
    service?: MessageBoxService
    contained?: boolean
  }

  let { service = defaultService, contained = false }: Props = $props()

  let current = $state<PendingMessageBox | undefined>()
  $effect(() => service.queue.subscribe((items) => (current = items[0])))
</script>

{#if current}
  {@const box = current}
  {#key box.id}
    <MessageBox
      {contained}
      text={box.options.text}
      caption={box.options.caption}
      buttons={box.options.buttons}
      icon={box.options.icon}
      defaultButton={box.options.defaultButton}
      onresult={(result) => service.settle(box.id, result)}
    />
  {/key}
{/if}
