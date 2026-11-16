<script lang="ts">
  /** The About box of an app's Help menu (`<app>-about`, OK `<app>-about-ok`). */
  import AboutDialog from '../../kit/organisms/AboutDialog.svelte'
  import type { AppHelp } from './AppHelp.svelte'

  let { help }: { help: AppHelp } = $props()
</script>

{#if help.about}
  <AboutDialog testid="{help.kind}-about" name={help.name} icon={help.icon} description={help.description} version={help.version} onclose={() => (help.about = false)} />
{/if}
