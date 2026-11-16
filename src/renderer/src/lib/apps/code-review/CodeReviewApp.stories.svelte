<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'
  import { sampleChatView } from '../storyHost.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Code Review',
    parameters: { layout: 'fullscreen' }
  })

  /** The fake review (src/lib/app/fakeReview.ts): changed files from the fake file system, two reviewer comments, a reply and a verdict. */
  const reviewView = (selectedPath: string | null) => ({ app: 'code-review' as const, root: 'E:\\', baseRef: 'HEAD', selectedPath, sessionId: 1 })
</script>

<Story name="Outline" asChild>
  <AppStory app="code-review" width={1120} height={620} view={reviewView(null)} setup={(host) => host.open({ app: 'chat' }, sampleChatView())} />
</Story>

<Story name="Expanded with comments" asChild>
  <AppStory app="code-review" width={1120} height={620} view={reviewView('src/auth/redirect.ts')} setup={(host) => host.open({ app: 'chat' }, sampleChatView())} />
</Story>
