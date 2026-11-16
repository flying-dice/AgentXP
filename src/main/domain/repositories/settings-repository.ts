export interface SettingsRepository {
  get(key: string): string | null
  set(key: string, value: string): void
  delete(key: string): boolean
  all(): Record<string, string>
}
