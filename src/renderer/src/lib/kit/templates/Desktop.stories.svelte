<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Desktop from './Desktop.svelte'
  import Form from '../organisms/Form.svelte'
  import Button from '../atoms/Button.svelte'
  import Label from '../atoms/Label.svelte'
  import CodeViewer from '../organisms/CodeViewer.svelte'
  import DiffViewer from '../organisms/DiffViewer.svelte'
  import ConsoleView from '../organisms/ConsoleView.svelte'
  import MessageBox from '../organisms/MessageBox.svelte'
  import type { TaskbarItem } from '../organisms/Taskbar.svelte'
  import { sampleAnsi, sampleNew, sampleOld, sampleTs } from '../organisms/stories.samples'

  const items: TaskbarItem[] = [
    { id: 'explorer', title: 'Explorer', icon: 'folder', pinned: true },
    { id: 'claude', title: 'Claude Code', icon: 'claude', running: true, active: true },
    { id: 'console', title: 'Console', icon: 'terminal', running: true }
  ]

  const { Story } = defineMeta({
    title: 'Templates/Desktop',
    component: Desktop,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } },
    args: { showTaskbar: true, taskbarItems: items, clock: new Date(2026, 10, 16, 1, 47) },
    argTypes: { showTaskbar: { control: 'boolean' }, onstart: { action: 'start' }, onitemclick: { action: 'itemclick' } }
  })
</script>

<Story name="Empty">
  {#snippet template(args)}
    <div style="height:100vh"><Desktop {...args} /></div>
  {/snippet}
</Story>

<Story name="WithWindows">
  {#snippet template(args)}
    <div style="height:100vh">
      <Desktop {...args}>
        <div class="win" style="left:40px;top:22px;width:620px;height:340px">
          <Form title="redirect.ts - Claude Code" iconName="claude" bodyColor="window">
            <CodeViewer code={sampleTs} language="typescript" toolbar />
          </Form>
        </div>
        <div class="win" style="left:300px;top:200px;width:560px;height:300px">
          <Form title="Console" iconName="terminal" active={false}>
            <ConsoleView text={sampleAnsi} />
          </Form>
        </div>
        <div class="win" style="left:520px;top:60px;width:560px;height:280px">
          <Form title="Changes" iconName="changes">
            <DiffViewer oldText={sampleOld} newText={sampleNew} fileName="src/auth/redirect.ts" context={1} />
          </Form>
        </div>
        <MessageBox contained text="Allow Claude to edit src\auth\redirect.ts?" caption="Claude Code" buttons="YesNoCancel" icon="shield" />
      </Desktop>
    </div>
  {/snippet}
</Story>

<Story name="WithoutTaskbar" args={{ showTaskbar: false }}>
  {#snippet template(args)}
    <div style="height:100vh">
      <Desktop {...args}>
        <div class="win" style="left:60px;top:40px;width:360px;height:160px">
          <Form title="Hello" dialog sizeGrip={false}>
            <div style="padding:14px"><Label>A lone dialog on the desktop.</Label><br /><br /><Button isDefault>OK</Button></div>
          </Form>
        </div>
      </Desktop>
    </div>
  {/snippet}
</Story>

<style>
  .win {
    position: absolute;
  }
</style>
