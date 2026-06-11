/**
 * @advisory v6.3 — DEBUG_DSL_REGISTRY single source of truth for all DSL commands.
 */
export const DEBUG_DSL_REGISTRY = {
  commands: [
    {
      id: "trace",
      prefix: "trace:",
      kind: "trace_flow",
      separator: "->",
      handler: "resolveNavigationPath",
    },
    {
      id: "module",
      prefix: "module:",
      kind: "module_lookup",
      handler: "resolveModuleLookup",
    },
    {
      id: "impact",
      prefix: "impact:",
      kind: "impact_trace",
      handler: "resolveImpactAnalysis",
    },
    {
      id: "time",
      prefix: "time:",
      kind: "time_machine",
      handler: "reconstructArchitectureAt",
    },
    {
      id: "snapshot",
      prefix: "snapshot:",
      kind: "snapshot_at",
      handler: "reconstructSnapshotAt",
    },
  ],
  defaultDepth: "important" as const,
  expandFlag: "expand:deep",
  depthFlag: "depth:deep",
} as const;

export type DebugDslCommandKind = (typeof DEBUG_DSL_REGISTRY.commands)[number]["kind"];
