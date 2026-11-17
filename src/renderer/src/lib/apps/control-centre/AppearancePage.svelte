<script lang="ts">
  /** Control Center > Appearance: placeholder settings. The infopanel switch drives the desktop's infopanel column when a desktop page is around. */
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import GroupBox from '../../kit/atoms/GroupBox.svelte'
  import { getDesktopContext } from '../../desktop/context'

  let desktop: ReturnType<typeof getDesktopContext>['desktop'] | null = null
  try {
    desktop = getDesktopContext().desktop
  } catch {
    // Not on a desktop page (Storybook): the switch only keeps its own state.
  }

  let local = $state(true)
  const checked = $derived(desktop ? desktop.infopanelsVisible : local)

  function toggle(value: boolean): void {
    if (desktop) desktop.infopanelsVisible = value
    else local = value
  }
</script>

<p class="lead">Change how the desktop looks.</p>
<GroupBox text="Desktop infopanels">
  <div class="body">
    <CheckBox label="Show infopanels on the desktop" {checked} onchange={toggle} />
    <p class="hint">InfoPanels show the context meter, the desktop clock and what the agent did last, in a column at the right of the desktop.</p>
  </div>
</GroupBox>
<GroupBox text="Theme">
  <div class="body">
    <p class="hint">Windows XP Luna (Blue). More themes may follow.</p>
  </div>
</GroupBox>

<style>
  .lead {
    margin: 0 0 10px;
  }
  .body {
    padding: 4px 6px 6px;
  }
  .hint {
    margin: 6px 0 0 20px;
    color: var(--xp-text-muted);
  }
</style>
