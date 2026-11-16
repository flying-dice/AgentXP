import type { PolicyDecision } from '@shared/desktop'

/** Stored Control Center decisions keyed by tool group (and `openApps`). Missing keys mean "use the default". */
export interface ToolPolicyRepository {
  all(): Record<string, PolicyDecision>
  set(key: string, decision: PolicyDecision): void
}
