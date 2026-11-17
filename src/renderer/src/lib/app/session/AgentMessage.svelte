<script lang="ts">
  import Icon from '../../kit/atoms/Icon.svelte'
  import MarkdownView from '../../kit/organisms/MarkdownView.svelte'

  interface Props {
    agentName: string
    text: string
    onlink?: (href: string) => void
    testid?: string
  }

  let { agentName, text, onlink, testid = 'chat-message-agent' }: Props = $props()
</script>

<div class="agent-message" data-testid={testid}>
  <div class="who"><Icon name="claude" size={12} />{agentName}</div>
  <div class="body"><MarkdownView source={text} {onlink} label="{agentName} message" /></div>
</div>

<style>
  .who {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 2px;
    font-weight: 700;
    color: var(--xp-accent-claude);
  }
  .body {
    font-size: 13px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
</style>
