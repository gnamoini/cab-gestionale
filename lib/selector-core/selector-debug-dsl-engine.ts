/**
 * @advisory v6.2 — Cursor Debug DSL parser + resolution engine.
 * @advisory v6.3 — commands derived from DEBUG_DSL_REGISTRY; adapter over explanation kernel.
 */
import { DEBUG_DSL_REGISTRY } from "@/lib/selector-core/selector-debug-dsl-registry";
import {
  reconstructArchitectureAt,
  reconstructSnapshotAt,
  type ArchitectureTimeSnapshot,
} from "@/lib/selector-core/selector-architecture-time-machine";
import {
  resolveExplanation,
  resolveImpactAnalysis,
  resolveModuleLookup,
  resolveNavigationPath,
} from "@/lib/selector-core/selector-explanation-kernel";
import {
  flattenRankedHints,
  rankObservationHints,
  type ObservationDepth,
  type RankedHints,
} from "@/lib/selector-core/selector-observation-ranking-engine";

export type DebugQueryKind =
  | "trace_flow"
  | "module_lookup"
  | "impact_trace"
  | "time_machine"
  | "snapshot_at";

export type ParsedDebugQuery =
  | { kind: "trace_flow"; steps: string[]; raw: string; expandDeep: boolean }
  | { kind: "module_lookup"; module: string; raw: string; expandDeep: boolean }
  | { kind: "impact_trace"; target: string; raw: string; expandDeep: boolean }
  | { kind: "time_machine"; timestamp: number; raw: string; expandDeep: boolean }
  | { kind: "snapshot_at"; version: string; timestamp: number; raw: string; expandDeep: boolean };

function normalizeArrowSeparators(raw: string): string {
  return raw.replace(/\s*→\s*/g, " -> ").replace(/\s+/g, " ").trim();
}

function stripExpandFlags(raw: string): { body: string; expandDeep: boolean } {
  let body = raw;
  let expandDeep = false;
  for (const flag of [DEBUG_DSL_REGISTRY.expandFlag, DEBUG_DSL_REGISTRY.depthFlag]) {
    if (body.includes(flag)) {
      expandDeep = true;
      body = body.replace(flag, "").trim();
    }
  }
  return { body, expandDeep };
}

function parseTraceFlow(body: string, raw: string, expandDeep: boolean): ParsedDebugQuery {
  const steps = body
    .split("->")
    .map((step) => step.trim().toLowerCase())
    .filter(Boolean);
  return { kind: "trace_flow", steps, raw, expandDeep };
}

function parseSnapshotAt(body: string, raw: string, expandDeep: boolean): ParsedDebugQuery {
  const match = body.match(/^([^@]+)@(\d+)$/);
  if (!match) {
    return {
      kind: "snapshot_at",
      version: body.trim(),
      timestamp: 0,
      raw,
      expandDeep,
    };
  }
  return {
    kind: "snapshot_at",
    version: match[1]!.trim(),
    timestamp: Number(match[2]),
    raw,
    expandDeep,
  };
}

function matchCommandPrefix(normalized: string): (typeof DEBUG_DSL_REGISTRY.commands)[number] | null {
  const sorted = [...DEBUG_DSL_REGISTRY.commands].sort(
    (a, b) => b.prefix.length - a.prefix.length,
  );
  const lower = normalized.toLowerCase();
  for (const command of sorted) {
    if (lower.startsWith(command.prefix)) return command;
  }
  return null;
}

export function parseDebugQuery(raw: string): ParsedDebugQuery {
  const { body, expandDeep } = stripExpandFlags(normalizeArrowSeparators(raw));
  const command = matchCommandPrefix(body);
  const lower = body.toLowerCase();

  if (command?.kind === "trace_flow") {
    return parseTraceFlow(body.slice(command.prefix.length).trim(), raw, expandDeep);
  }
  if (command?.kind === "module_lookup") {
    return {
      kind: "module_lookup",
      module: body.slice(command.prefix.length).trim().toLowerCase(),
      raw,
      expandDeep,
    };
  }
  if (command?.kind === "impact_trace") {
    return {
      kind: "impact_trace",
      target: body.slice(command.prefix.length).trim(),
      raw,
      expandDeep,
    };
  }
  if (command?.kind === "time_machine") {
    const ts = Number(body.slice(command.prefix.length).trim());
    return {
      kind: "time_machine",
      timestamp: Number.isFinite(ts) ? ts : 0,
      raw,
      expandDeep,
    };
  }
  if (command?.kind === "snapshot_at") {
    return parseSnapshotAt(body.slice(command.prefix.length).trim(), raw, expandDeep);
  }

  if (body.includes("->")) {
    return parseTraceFlow(body, raw, expandDeep);
  }

  return { kind: "module_lookup", module: lower, raw, expandDeep };
}

export type CursorDebugResult = {
  summary: string;
  navigationPath: string[];
  fileHints: string[];
  testHints: string[];
  confidence: number;
  rankedHints: RankedHints;
  depth: ObservationDepth;
  expandable: boolean;
  timeSnapshot?: ArchitectureTimeSnapshot;
};

export type TraceFlowResolution = {
  steps: string[];
  modules: string[];
  fileHints: string[];
};

export type ModuleLookupResolution = {
  primaryFiles: string[];
  relatedTests: string[];
  relatedDocs: string[];
};

export type ImpactAnalysisResolution = {
  upstream: string[];
  downstream: string[];
  riskZones: string[];
};

function toCursorResult(input: {
  summary: string;
  navigationPath: string[];
  fileHints: string[];
  testHints: string[];
  docs?: string[];
  confidence: number;
  expandDeep: boolean;
  target?: string;
  timeSnapshot?: ArchitectureTimeSnapshot;
}): CursorDebugResult {
  const ranked = rankObservationHints({
    files: input.fileHints,
    tests: input.testHints,
    docs: input.docs,
    target: input.target,
  });
  const depth: ObservationDepth = input.expandDeep ? "deep" : DEBUG_DSL_REGISTRY.defaultDepth;
  const flattened = flattenRankedHints(ranked, depth);

  return {
    summary: input.summary,
    navigationPath: input.navigationPath,
    fileHints: flattened,
    testHints: input.testHints,
    confidence: input.confidence,
    rankedHints: ranked,
    depth,
    expandable: ranked.deep.length > 0,
    timeSnapshot: input.timeSnapshot,
  };
}

function executeParsedQuery(parsed: ParsedDebugQuery): CursorDebugResult {
  if (parsed.kind === "trace_flow") {
    const flow = resolveNavigationPath(parsed.steps);
    const testHints = parsed.steps.flatMap((s) => resolveModuleLookup(s).relatedTests);
    return toCursorResult({
      summary: `Trace flow ${parsed.steps.join(" → ")} (${flow.modules.length} module hint(s))`,
      navigationPath: flow.steps.map((s) => `step:${s}`),
      fileHints: flow.fileHints,
      testHints,
      confidence: parsed.steps.length > 0 ? 0.9 : 0.3,
      expandDeep: parsed.expandDeep,
    });
  }

  if (parsed.kind === "module_lookup") {
    const lookup = resolveModuleLookup(parsed.module);
    const explanation = resolveExplanation({ query: parsed.module });
    return toCursorResult({
      summary: `Module lookup "${parsed.module}" (${lookup.primaryFiles.length} primary file(s))`,
      navigationPath: explanation.relatedModules.map((v) => `module:${v}`),
      fileHints: lookup.primaryFiles,
      testHints: lookup.relatedTests,
      docs: lookup.relatedDocs,
      confidence: lookup.primaryFiles.length > 0 ? 0.85 : 0.4,
      expandDeep: parsed.expandDeep,
      target: parsed.module,
    });
  }

  if (parsed.kind === "impact_trace") {
    const impact = resolveImpactAnalysis(parsed.target);
    const allFiles = [...impact.upstream, ...impact.downstream, ...impact.riskZones];
    return toCursorResult({
      summary: `Impact analysis for "${parsed.target}" (${allFiles.length} related file(s))`,
      navigationPath: [
        ...impact.upstream.map((f) => `upstream:${f}`),
        ...impact.downstream.map((f) => `downstream:${f}`),
        ...impact.riskZones.map((f) => `risk:${f}`),
      ],
      fileHints: allFiles,
      testHints: resolveModuleLookup("runtime").relatedTests,
      confidence: allFiles.length > 0 ? 0.8 : 0.35,
      expandDeep: parsed.expandDeep,
      target: parsed.target,
    });
  }

  if (parsed.kind === "time_machine") {
    const timeSnapshot = reconstructArchitectureAt({ timestamp: parsed.timestamp });
    return toCursorResult({
      summary: `Architecture at t=${parsed.timestamp} (confidence=${timeSnapshot.confidence.toFixed(2)})`,
      navigationPath: [
        `active:${timeSnapshot.activeSnapshot.version}`,
        `pointer:${timeSnapshot.pointerState.activeVersion}`,
        `policy:${timeSnapshot.policyState.rulesetVersion}`,
      ],
      fileHints: [
        "lib/selector-core/generated/selector-active-pointer.json",
        "lib/selector-core/generated/selector-bundle-manifest.json",
        "lib/selector-core/generated/selector-rollback-registry.generated.ts",
      ],
      testHints: resolveModuleLookup("snapshot").relatedTests,
      confidence: timeSnapshot.confidence,
      expandDeep: parsed.expandDeep,
      timeSnapshot,
    });
  }

  const timeSnapshot = reconstructSnapshotAt({
    version: parsed.version,
    timestamp: parsed.timestamp,
  });
  return toCursorResult({
    summary: `Snapshot ${parsed.version}@${parsed.timestamp} (confidence=${timeSnapshot.confidence.toFixed(2)})`,
    navigationPath: [
      `version:${parsed.version}`,
      `timestamp:${parsed.timestamp}`,
      `valid:${String(timeSnapshot.policyState.converged)}`,
    ],
    fileHints: resolveModuleLookup("snapshot").primaryFiles,
    testHints: resolveModuleLookup("snapshot").relatedTests,
    confidence: timeSnapshot.confidence,
    expandDeep: parsed.expandDeep,
    timeSnapshot,
  });
}

export function resolveTraceFlow(steps: string[]): TraceFlowResolution {
  return resolveNavigationPath(steps);
}

export { resolveModuleLookup, resolveImpactAnalysis };

export function executeDebugQuery(query: string): CursorDebugResult {
  return executeParsedQuery(parseDebugQuery(query));
}
