<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import ConsoleView from './ConsoleView.svelte'
  import Button from '../atoms/Button.svelte'
  import { ANSI_PALETTE } from './ansi'
  import { sampleAnsi } from './stories.samples'

  const { Story } = defineMeta({
    title: 'Organisms/ConsoleView',
    component: ConsoleView,
    args: { text: sampleAnsi, running: false, autoScroll: true },
    argTypes: {
      text: { control: 'text' },
      running: { control: 'boolean' },
      autoScroll: { control: 'boolean' }
    }
  })

  let streamText = $state('')
  let streaming = $state(false)
  const run = (): void => {
    streaming = true
    streamText = '\u001b[1m$ npm run build\u001b[0m\n'
    let n = 0
    const timer = setInterval(() => {
      streamText += `\u001b[36m[${String(++n).padStart(2, '0')}/40]\u001b[0m compiling module ${n}...\n`
      if (n >= 40) {
        streamText += '\u001b[1;32mBuild succeeded\u001b[0m\n'
        streaming = false
        clearInterval(timer)
      }
    }, 120)
  }

  const ESC = '\u001b'
  const palette = ANSI_PALETTE.map((_, i) => `${ESC}[${i < 8 ? 40 + i : 92 + i}m  ${ESC}[0m`).join('') + '\n' +
    Array.from({ length: 8 }, (_, i) => `${ESC}[${30 + i}mcolor${i}${ESC}[0m `).join('') + '\n' +
    Array.from({ length: 8 }, (_, i) => `${ESC}[${90 + i}mbright${i}${ESC}[0m `).join('') + '\n' +
    `${ESC}[1mbold${ESC}[0m ${ESC}[1;31mbold red${ESC}[0m ${ESC}[4munderline${ESC}[0m ${ESC}[7minverse${ESC}[0m`
</script>

<Story name="Default">
  {#snippet template(args)}
    <div style="width:620px;height:260px"><ConsoleView {...args} /></div>
  {/snippet}
</Story>

<Story name="Palette" args={{ text: palette }}>
  {#snippet template(args)}
    <div style="width:520px;height:110px"><ConsoleView {...args} /></div>
  {/snippet}
</Story>

<Story name="Streaming" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div class="col">
      <Button onclick={run} disabled={streaming}>Run</Button>
      <div style="width:520px;height:160px"><ConsoleView text={streamText} running={streaming} /></div>
      <p class="hint">Scroll up while it runs: auto-scroll pauses until you return to the bottom.</p>
    </div>
  {/snippet}
</Story>

<Story name="Empty" args={{ text: '' }}>
  {#snippet template(args)}
    <div style="width:420px;height:80px"><ConsoleView {...args} /></div>
  {/snippet}
</Story>

<style>
  .col {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  .hint {
    margin: 0;
    font-size: 11px;
    color: #555;
  }
</style>
