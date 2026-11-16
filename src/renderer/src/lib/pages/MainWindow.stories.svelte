<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import MainWindow from './MainWindow.svelte'
  import MessageBoxHost from '../kit/organisms/MessageBoxHost.svelte'
  import { createFakeApi } from '../app/fakeApi'
  import { UiStore } from '../stores/UiStore.svelte'

  const memory = { getItem: () => null, setItem: () => {} }

  const { Story } = defineMeta({
    title: 'Pages/MainWindow',
    component: MainWindow,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } }
  })
</script>

<Story name="WithSessions" asChild>
  <div class="desktop">
    <MainWindow api={createFakeApi()} ui={new UiStore(memory)} />
    <MessageBoxHost />
  </div>
</Story>

<Story name="GettingStarted" asChild>
  <div class="desktop">
    <MainWindow api={createFakeApi({ empty: true })} ui={new UiStore(memory)} />
    <MessageBoxHost />
  </div>
</Story>

<style>
  .desktop {
    position: relative;
    height: 100vh;
    background: var(--w7-desktop);
  }
</style>
