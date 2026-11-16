<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AgentMessage from './AgentMessage.svelte'
  import ErrorRow from './ErrorRow.svelte'
  import ReasoningBlock from './ReasoningBlock.svelte'
  import UserMessage from './UserMessage.svelte'

  const { Story } = defineMeta({ title: 'App/Session/MessageRows', parameters: { controls: { disable: true } } })
</script>

<Story name="UserMessage">
  <div class="box"><UserMessage text="Fix the login redirect so deep links survive sign-in" attachments={['login-bug.md', 'screenshot.png']} /></div>
</Story>

<Story name="AgentMessage">
  <div class="box">
    <AgentMessage agentName="Claude Code" text={'Deep links now survive sign-in:\n\n- `sanitizeReturnUrl` accepts **same-origin paths only**\n- falls back to `/home`\n\n```ts\nconst target = returnUrl ?? "/home"\n```'} />
  </div>
</Story>

<Story name="ReasoningBlock">
  <div class="box"><ReasoningBlock text="The handler always redirects to /home. I should read the returnUrl parameter and validate it." /></div>
</Story>

<Story name="ErrorRow">
  <div class="box"><ErrorRow message="The agent process exited unexpectedly (code 1)." /></div>
</Story>

<style>
  .box {
    width: 560px;
    padding: 8px 10px;
    background: #fff;
  }
</style>
