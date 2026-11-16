import { describe, expect, it } from 'vitest'
import { SurfaceSubmit } from './surfaceSubmit.svelte'

describe('SurfaceSubmit', () => {
  it('shows Sending... from the press until a turn has started and ended, then Sent.', () => {
    const submit = new SurfaceSubmit()
    submit.begin('send')
    expect(submit.phase).toBe('sending')
    submit.follow(false) // the turn has not started yet
    expect(submit.phase).toBe('sending')
    submit.follow(true)
    submit.follow(false)
    expect(submit.phase).toBe('sent')
    expect(submit.sourceId).toBe('send')
  })

  it('is sent at once when nothing tells whether the agent is busy', () => {
    const submit = new SurfaceSubmit()
    submit.begin('send')
    submit.follow(undefined)
    expect(submit.phase).toBe('sent')
  })

  it('can be sent again after the agent changed the form', () => {
    const submit = new SurfaceSubmit()
    submit.begin('send')
    submit.finish()
    submit.reset()
    expect(submit.phase).toBe('idle')
  })
})
