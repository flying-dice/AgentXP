import { describe, expect, it } from 'vitest'
import { chatAboutTitle, folderLabel } from './folderLabel'

const drives = [
  { letter: 'C', label: 'Local Disk' },
  { letter: 'E', label: 'login-app' }
]

describe('folderLabel', () => {
  it('names a project by its drive label and letter', () => {
    expect(folderLabel('E:\\', drives)).toBe('login-app (E:)')
  })

  it('names a folder by its own name and the drive', () => {
    expect(folderLabel('E:\\src\\auth', drives)).toBe('auth (E:)')
    expect(folderLabel('C:\\Users\\Agent', drives)).toBe('Agent (C:)')
  })

  it('falls back to the letter for an unknown drive and to the text for a bad path', () => {
    expect(folderLabel('G:\\', drives)).toBe('G:')
    expect(folderLabel('nonsense', drives)).toBe('nonsense')
  })
})

describe('chatAboutTitle', () => {
  it('says where the pane of a window works', () => {
    expect(chatAboutTitle('E:\\', drives)).toBe('Chat about login-app (E:)')
    expect(chatAboutTitle('C:\\Users\\Agent', drives)).toBe('Chat about Agent (C:)')
  })
})
