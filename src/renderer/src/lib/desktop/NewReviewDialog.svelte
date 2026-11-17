<script lang="ts">
  /** "Review changes...": picks what Code Review looks at: the drive (project) and the ref to compare it against. */
  import { type DriveDto, type VPath } from '@shared/vfs'
  import Icon from '../kit/atoms/Icon.svelte'
  import Button from '../kit/atoms/Button.svelte'
  import ComboBox from '../kit/atoms/ComboBox.svelte'
  import Dialog from '../kit/organisms/Dialog.svelte'
  import { driveRoot, driveTitle, sortDrives } from '../apps/explorer/explorerModel'

  interface Props {
    drives: DriveDto[]
    /** The drive root to preselect. */
    root?: VPath
    onstart?: (root: VPath, baseRef: string) => void
    oncancel?: () => void
  }

  let { drives, root, onstart, oncancel }: Props = $props()

  const REFS = [
    { value: 'HEAD', label: 'Uncommitted changes (HEAD)' },
    { value: 'HEAD~1', label: 'Last commit and uncommitted changes (HEAD~1)' },
    { value: 'main', label: 'Branch main' }
  ]

  const options = $derived(
    sortDrives(drives).map((d) => ({
      letter: d.letter,
      root: driveRoot(d.letter),
      title: driveTitle(d),
      sub: d.kind === 'removable' ? 'Project' : 'Your files (C:), not a git repository',
      icon: d.kind === 'removable' ? ('usb' as const) : ('drive' as const)
    }))
  )
  // svelte-ignore state_referenced_locally
  let chosen = $state<string | null>(root ?? null)
  const current = $derived(options.find((o) => o.root === chosen) ?? options.find((o) => o.sub === 'Project') ?? options[0] ?? null)
  let baseRef = $state('HEAD')
  const ref = $derived(baseRef.trim())
  const start = (): void => {
    if (current && ref) onstart?.(current.root, ref)
  }
</script>

<Dialog testid="new-review-dialog" title="Code Review" iconName="changes" width="440px" contained bodyColor="window" onclose={() => oncancel?.()}>
  <div class="body">
    <p>What do you want to review?</p>
    <ul role="radiogroup" aria-label="Project">
      {#each options as option (option.letter)}
        <li>
          <button
            type="button"
            class="option"
            role="radio"
            aria-checked={current?.letter === option.letter}
            class:on={current?.letter === option.letter}
            data-testid="new-review-drive-{option.letter.toLowerCase()}"
            onclick={() => (chosen = option.root)}
            ondblclick={start}
          >
            <Icon name={option.icon} size={32} />
            <span class="text"><span class="title">{option.title}</span><span class="sub">{option.sub}</span></span>
          </button>
        </li>
      {/each}
    </ul>
    <label class="ref">
      <span>Compare against:</span>
      <ComboBox testid="new-review-ref" style="flex:1" items={REFS} dropDownStyle="DropDown" bind:value={baseRef} aria-label="Compare against (a branch, tag or commit)" />
    </label>
  </div>
  {#snippet buttons()}
    <Button data-testid="new-review-start" isDefault disabled={!current || !ref} onclick={start}>Review</Button>
    <Button data-testid="new-review-cancel" onclick={() => oncancel?.()}>Cancel</Button>
  {/snippet}
</Dialog>

<style>
  .body {
    padding: 12px 16px 8px;
    background: var(--xp-window);
  }
  p {
    margin: 0 0 8px;
    color: #1e3287;
  }
  ul {
    list-style: none;
    margin: 0 0 10px;
    padding: 0;
    max-height: 200px;
    overflow: auto;
  }
  .option {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 8px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: default;
  }
  .option:hover,
  .option:focus-visible {
    border-color: var(--xp-hot-border);
    background: var(--xp-hot-face);
    outline: 0;
  }
  .option.on {
    border-color: var(--xp-select-border, #316ac5);
    background: var(--xp-select-face, #d6dff7);
  }
  .text {
    display: flex;
    flex-direction: column;
  }
  .title {
    color: #0b3b9c;
  }
  .sub {
    color: var(--xp-text-muted);
  }
  .ref {
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
