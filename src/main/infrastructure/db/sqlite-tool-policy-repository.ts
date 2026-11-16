import type { PolicyDecision } from '@shared/desktop'
import type { ToolPolicyRepository } from '../../domain/repositories/tool-policy-repository'
import { prepare, type Database, type Statement } from './sql'

export class SqliteToolPolicyRepository implements ToolPolicyRepository {
  private readonly selectAll: Statement<[], { tool_group: string; decision: PolicyDecision }>
  private readonly upsert: Statement<[string, string]>

  constructor(db: Database) {
    this.selectAll = prepare(db, 'SELECT tool_group, decision FROM tool_group_policies')
    this.upsert = prepare(
      db,
      'INSERT INTO tool_group_policies (tool_group, decision) VALUES (?, ?) ON CONFLICT (tool_group) DO UPDATE SET decision = excluded.decision'
    )
  }

  all(): Record<string, PolicyDecision> {
    return Object.fromEntries(this.selectAll.all().map((row) => [row.tool_group, row.decision]))
  }

  set(key: string, decision: PolicyDecision): void {
    this.upsert.run(key, decision)
  }
}
