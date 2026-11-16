<script lang="ts">
  /**
   * Windows 7 "Browse For Folder": a tree of folders (Computer at the root, shortcuts above it), a Folder box
   * that follows the selection and accepts a typed path, Make New Folder, OK and Cancel. Resizable.
   */
  import { onMount } from 'svelte'
  import Button from '../atoms/Button.svelte'
  import Label from '../atoms/Label.svelte'
  import TextBox from '../atoms/TextBox.svelte'
  import DialogButtons from '../molecules/DialogButtons.svelte'
  import type { DialogResult } from '../molecules/DialogButtons'
  import Dialog from './Dialog.svelte'
  import TreeView from './TreeView.svelte'
  import type { TreeNodeData } from './TreeView'
  import {
    cleanTypedPath,
    COMPUTER_ID,
    emptyFolderNode,
    entryNode,
    groupChildId,
    isBareName,
    MATCHES_ID,
    matchesGroup,
    NAME_LOOKUP_DELAY_MS,
    RECENT_ID,
    withMatches,
    FOLDER_BROWSER_INSTRUCTIONS,
    NEW_FOLDER_NAME,
    rootNodes,
    startFolderIds,
    type FolderBrowserPurpose,
    type FolderBrowserSource
  } from './FolderBrowserDialog'

  interface Props {
    purpose?: FolderBrowserPurpose
    source: FolderBrowserSource
    /** Caption; default "Browse For Folder". */
    title?: string
    /** Position the overlay inside the nearest positioned ancestor (stories). */
    contained?: boolean
    /** Called with the chosen folder path, or null when cancelled. */
    onresult?: (path: string | null) => void
  }

  let { purpose = 'desktop', source, title = 'Browse For Folder', contained = false, onresult }: Props = $props()

  const paths = new Map<string, string>()
  let nodes = $state.raw<TreeNodeData[]>([])
  let selected = $state<string | null>(null)
  let expanded = $state(new Set<string>([COMPUTER_ID]))
  let path = $state('')
  let busy = $state(0)
  let problem = $state('')
  // Re-creates the tree after Make New Folder so that it lists the new folder.
  let treeKey = $state(0)

  const status = $derived(busy > 0 ? 'Opening the folder list...' : problem)
  const text = $derived(cleanTypedPath(path))
  const canOk = $derived(text !== '' && busy === 0)

  async function track<T>(work: Promise<T>): Promise<T> {
    busy++
    try {
      return await work
    } finally {
      busy--
    }
  }

  onMount(() => {
    void track(source.browse('')).then(
      (listing) => {
        nodes = rootNodes(listing, paths)
        // The tree opens its seeded nodes only at mount; this one arrives later, so open it here.
        if (nodes.some((n) => n.id === RECENT_ID)) expanded = new Set([...expanded, RECENT_ID])
        else expanded = new Set([...expanded, ...startFolderIds(listing.places)])
      },
      (error: unknown) => (problem = message(error))
    )
  })

  // A name typed instead of a path is looked up 400 ms after the last key.
  $effect(() => {
    const typed = text
    if (!isBareName(typed)) return
    const timer = setTimeout(() => void lookUp(typed, false), NAME_LOOKUP_DELAY_MS)
    return () => clearTimeout(timer)
  })

  /** Finds the folder of a typed name; resolves the full path when exactly one folder has that name. */
  async function lookUp(name: string, accept: boolean): Promise<void> {
    problem = ''
    try {
      const listing = await track(source.browse(name))
      if (text !== name) return
      const found = listing.matches ?? []
      if (found.length > 1) {
        nodes = withMatches(nodes, matchesGroup(found, paths))
        expanded = new Set([...expanded, MATCHES_ID])
        problem = `More than one folder is called '${name}'. Select one in the list.`
        return
      }
      const only = found[0]
      if (!only) return
      if (accept) return onresult?.(only.path)
      const known = nodes.find((n) => n.id === RECENT_ID)?.children?.some((c) => paths.get(c.id) === only.path)
      if (!known) nodes = withMatches(nodes, matchesGroup(found, paths))
      else nodes = withMatches(nodes, null)
      expanded = new Set([...expanded, known ? RECENT_ID : MATCHES_ID])
      selected = groupChildId(known ? RECENT_ID : MATCHES_ID, only.path)
      path = only.path
    } catch (error) {
      if (text === name) problem = message(error)
    }
  }

  const message = (error: unknown): string => (error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']*': (Error: )?/, '') : String(error))

  async function expand(node: TreeNodeData): Promise<TreeNodeData[]> {
    const at = paths.get(node.id) ?? ''
    problem = ''
    try {
      const listing = await track(source.browse(at))
      const kids = listing.entries.map((e) => entryNode(node.id, e, paths))
      return kids.length > 0 ? kids : [emptyFolderNode(node.id)]
    } catch (error) {
      problem = message(error)
      return []
    }
  }

  function choose(node: TreeNodeData): void {
    path = paths.get(node.id) ?? ''
    problem = ''
  }

  async function makeFolder(): Promise<void> {
    const parentId = selected
    if (!parentId || !text) return
    problem = ''
    try {
      const made = await track(source.makeFolder(text, NEW_FOLDER_NAME))
      const madeId = `${parentId}>${made}`
      expanded = new Set([...expanded, parentId])
      treeKey++
      paths.set(madeId, made)
      selected = madeId
      path = made
    } catch (error) {
      problem = message(error)
    }
  }

  async function result(r: DialogResult): Promise<void> {
    if (r !== 'ok') return onresult?.(null)
    if (!canOk) return
    if (isBareName(text)) return lookUp(text, true)
    try {
      const listing = await track(source.browse(text))
      onresult?.(listing.path)
    } catch (error) {
      problem = message(error)
    }
  }
</script>

<Dialog
  testid="folder-browser-dialog"
  {title}
  iconName="folder"
  width="400px"
  height="440px"
  style="min-width:380px;min-height:420px;max-width:96vw;max-height:96vh;resize:both;overflow:hidden;"
  fill
  {contained}
  onclose={() => onresult?.(null)}
>
  <div class="body" class:busy={busy > 0} aria-busy={busy > 0}>
    <p class="instruction" data-testid="folder-browser-instruction">{FOLDER_BROWSER_INSTRUCTIONS[purpose]}</p>
    <div class="tree">
      {#key treeKey}
        <TreeView testid="folder-browser-tree" aria-label="Folders" {nodes} bind:selected bind:expanded onexpand={expand} onselect={choose} />
      {/key}
    </div>
    <p class="status" data-testid="folder-browser-status" class:error={busy === 0 && problem !== ''} role="status">{status}</p>
    <div class="folder">
      <Label text="Folder:" for="fbd-path" />
      <TextBox id="fbd-path" data-testid="folder-browser-path" bind:value={path} data-autofocus spellcheck="false" autocomplete="off" />
    </div>
  </div>
  {#snippet buttons()}
    <div class="bar">
      <Button data-testid="folder-browser-new-folder" disabled={!canOk} onclick={() => void makeFolder()}>Make New Folder</Button>
      <DialogButtons buttons={[{ result: 'ok', disabled: !canOk }, 'cancel']} onresult={(r) => void result(r)} />
    </div>
  {/snippet}
</Dialog>

<style>
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px 0;
  }
  .body.busy,
  .body.busy :global(*) {
    cursor: wait;
  }
  .instruction {
    margin: 0 0 6px;
  }
  .tree {
    flex: 1;
    min-height: 0;
  }
  .status {
    margin: 0;
    min-height: 15px;
    color: var(--w7-text-muted, #444);
  }
  .status.error {
    color: #a01408;
  }
  .folder {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .folder :global(.w7-textbox) {
    flex: 1;
    min-width: 0;
  }
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
</style>
