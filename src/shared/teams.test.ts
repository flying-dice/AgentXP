import { describe, expect, it } from 'vitest'
import { activityLabel, colorOfName, mentionHandle, mentionedMembers, parseSkillFrontMatter } from './teams'

const members = [{ name: 'Planner' }, { name: 'Code Reviewer' }, { name: 'Coder' }]

describe('mentions', () => {
  it('ignores spaces, case and dashes in a handle', () => {
    expect(mentionHandle('Code Reviewer')).toBe('codereviewer')
    expect(mentionedMembers('hey @code-reviewer look', members).map((m) => m.name)).toEqual(['Code Reviewer'])
    expect(mentionedMembers('@CODEREVIEWER', members)).toHaveLength(1)
  })

  it('finds several members once each, in team order', () => {
    expect(mentionedMembers('@Coder then @Planner and @coder again', members).map((m) => m.name)).toEqual(['Planner', 'Coder'])
  })

  it('does not match part of a name or an email address', () => {
    expect(mentionedMembers('@Cod', members)).toEqual([])
    expect(mentionedMembers('mail me@planner.test', members)).toEqual([])
  })

  it('calls everyone with @all or @team', () => {
    expect(mentionedMembers('@all stand up', members)).toHaveLength(3)
    expect(mentionedMembers('@team', members)).toHaveLength(3)
  })

  it('calls nobody without a mention', () => {
    expect(mentionedMembers('no mention here', members)).toEqual([])
  })
})

describe('labels and colours', () => {
  it('words the activity of a member', () => {
    expect(activityLabel('idle', 0)).toBeNull()
    expect(activityLabel('thinking', 0)).toBe('thinking…')
    expect(activityLabel('waiting', 2)).toBe('waiting for approval (2 waiting)')
  })

  it('gives the same colour to the same name', () => {
    expect(colorOfName('Coder')).toBe(colorOfName('Coder'))
    expect(colorOfName('Coder')).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('parseSkillFrontMatter', () => {
  it('reads name and description, quoted or not', () => {
    expect(parseSkillFrontMatter('---\nname: pdf\ndescription: "Read PDFs"\n---\n# Body')).toEqual({ name: 'pdf', description: 'Read PDFs' })
    expect(parseSkillFrontMatter("﻿---\r\nname: 'a b'\r\ndescription: x y\r\n---\r\n")).toEqual({ name: 'a b', description: 'x y' })
  })

  it('rejects a file without front matter or without both keys', () => {
    expect(parseSkillFrontMatter('# Just a heading')).toBeNull()
    expect(parseSkillFrontMatter('---\nname: x\n---\n')).toBeNull()
  })
})
