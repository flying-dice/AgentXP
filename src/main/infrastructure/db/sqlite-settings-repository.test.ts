import { describe, expect, it } from 'vitest'
import { openDatabase } from './open-database'
import { SqliteSettingsRepository } from './sqlite-settings-repository'

describe('SqliteSettingsRepository', () => {
  it('gets, sets, overwrites, deletes and lists', () => {
    const repo = new SqliteSettingsRepository(openDatabase(':memory:'))
    expect(repo.get('theme')).toBeNull()
    repo.set('theme', 'aero')
    repo.set('zoom', '1')
    repo.set('theme', 'basic')
    expect(repo.get('theme')).toBe('basic')
    expect(repo.all()).toEqual({ theme: 'basic', zoom: '1' })
    expect(repo.delete('theme')).toBe(true)
    expect(repo.delete('theme')).toBe(false)
    expect(repo.all()).toEqual({ zoom: '1' })
  })
})
