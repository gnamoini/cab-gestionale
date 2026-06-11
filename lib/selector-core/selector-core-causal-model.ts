/**
 * @advisory v5.5 — single SSOT causal representation (decision/fallback/GC/temporal).
 */
import crypto from "node:crypto";
import type { FallbackTrace, SelectorDecisionTrace } from "@/lib/selector-core/selector-decision-trace";
import type { LifecycleClassification } from "@/lib/selector-core/selector-snapshot-lifecycle-manager";
import { MIN_ROLLBACK_BUFFER } from "@/lib/selector-core/selector-snapshot-lifecycle-manager";
import { sortVersionsByRecency } from "@/lib/selector-core/selector-snapshot-pruner";
import type { SelectorRuntimeContext } from "@/lib/selector-core/selector-runtime-context-snapshot";
import type {
  SelectorSnapshotManifest,
  SelectorSnapshotPointer,
  SnapshotRetentionClass,
} from "@/lib/selector-core/types";

export type UnifiedCausalEventType = "decision" | "fallback" | "gc" | "temporal";

export type UnifiedCausalEvent = {
  eventId: string;
  type: UnifiedCausalEventType;
  timestamp: number;
  node: string;
  edges: string[];
  metadata: Record<string, string>;
};

export type UnifiedSelectorCausalModel = {
  events: UnifiedCausalEvent[];
  rootEventIds: string[];
  builtAt: number;
};

/** @deprecated v5.5 — use UnifiedSelectorCausalModel */
export type UnifiedCausalIndex = UnifiedSelectorCausalModel;

export type GcLineageEdge = {
  from: string;
  to: string;
  kind: "lineage" | "pinned" | "rollback";
};

/** Internal GC lineage input (not a graph model). */
export type GcLineageInput = {
  nodes: string[];
  edges: GcLineageEdge[];
  protected: string[];
};

/** @deprecated v5.5 — internal lineage input only */
export type SnapshotDependencyGraph = GcLineageInput;

export type BuildCausalModelInput = {
  decisionTrace?: SelectorDecisionTrace;
  fallbackTrace?: FallbackTrace | null;
  /** @deprecated v5.5 — use gcLineage */
  gcGraph?: GcLineageInput;
  gcLineage?: GcLineageInput;
  temporalManifest?: SelectorSnapshotManifest;
  temporalPointer?: SelectorSnapshotPointer;
  temporalClassification?: LifecycleClassification;
  runtimeContext?: SelectorRuntimeContext | null;
  checkpointPhase?: string;
};

export type CausalModelQueryFilter = {
  type?: UnifiedCausalEventType;
  nodePrefix?: string;
};

/** @deprecated v5.5 */
export type BuildUnifiedCausalIndexInput = BuildCausalModelInput;

/** @deprecated v5.5 */
export type UnifiedCausalQueryFilter = CausalModelQueryFilter;

/** @advisory v5.6 — read-only semantic projections (no data split) */
export type CausalViewType = "decision" | "fallback" | "gc" | "temporal" | "full";

export type CausalModelView = {
  viewType: CausalViewType;
  events: UnifiedCausalEvent[];
  rootEventIds: string[];
  eventCount: number;
};

function buildCausalView(
  model: UnifiedSelectorCausalModel,
  viewType: CausalViewType,
  events: UnifiedCausalEvent[],
): CausalModelView {
  const eventIds = new Set(events.map((e) => e.eventId));
  const rootEventIds =
    viewType === "full"
      ? [...model.rootEventIds]
      : model.rootEventIds.filter((id) => eventIds.has(id));

  return {
    viewType,
    events,
    rootEventIds,
    eventCount: events.length,
  };
}

export function getDecisionView(model: UnifiedSelectorCausalModel): CausalModelView {
  return buildCausalView(
    model,
    "decision",
    queryCausalModel(model, { type: "decision" }),
  );
}

export function getFallbackView(model: UnifiedSelectorCausalModel): CausalModelView {
  return buildCausalView(
    model,
    "fallback",
    queryCausalModel(model, { type: "fallback" }),
  );
}

export function getGcView(model: UnifiedSelectorCausalModel): CausalModelView {
  return buildCausalView(model, "gc", queryCausalModel(model, { type: "gc" }));
}

export function getTemporalView(model: UnifiedSelectorCausalModel): CausalModelView {
  return buildCausalView(
    model,
    "temporal",
    queryCausalModel(model, { type: "temporal" }),
  );
}

export function getFullCausalView(model: UnifiedSelectorCausalModel): CausalModelView {
  return buildCausalView(model, "full", model.events);
}

const PROTECTED_CLASSES = new Set<SnapshotRetentionClass>([
  "active",
  "previous_safe",
  "pinned",
]);

function sortEvents(events: UnifiedCausalEvent[]): UnifiedCausalEvent[] {
  return [...events].sort((a, b) => {
    const tsCmp = a.timestamp - b.timestamp;
    if (tsCmp !== 0) return tsCmp;
    const typeCmp = a.type.localeCompare(b.type);
    if (typeCmp !== 0) return typeCmp;
    return a.eventId.localeCompare(b.eventId);
  });
}

function parseTimestamp(value: string | number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function warnLegacyGraphAccess(caller: string): void {
  if (typeof process === "undefined") return;
  if (
    process.env.NODE_ENV === "production" &&
    process.env.SELECTOR_TELEMETRY_DEBUG !== "true"
  ) {
    return;
  }
  console.warn(
    `[selector-core-causal-model] deprecated legacy graph access from ${caller}; use UnifiedSelectorCausalModel`,
  );
}

export function warnLegacyTemporalGraphAccess(caller: string): void {
  warnLegacyGraphAccess(caller);
}

export function buildGcLineageInput(
  manifest: SelectorSnapshotManifest,
  classification: LifecycleClassification,
): GcLineageInput {
  const nodes = new Set<string>([
    ...Object.keys(classification.retention),
    ...manifest.versions,
    ...classification.rollbackSafeVersions,
  ]);
  const edges: GcLineageEdge[] = [];
  const protectedSet = new Set<string>([
    ...classification.rollbackSafeVersions,
    ...Object.entries(classification.retention)
      .filter(([, cls]) => PROTECTED_CLASSES.has(cls))
      .map(([version]) => version),
    ...(manifest.pinnedVersions ?? []),
  ]);

  const active = manifest.activeVersion;
  if (active) {
    protectedSet.add(active);
  }

  const sortedVersions = sortVersionsByRecency(manifest.versions);
  for (let i = 0; i < sortedVersions.length - 1; i += 1) {
    const newer = sortedVersions[i];
    const older = sortedVersions[i + 1];
    if (newer && older) {
      edges.push({ from: newer, to: older, kind: "lineage" });
    }
  }

  for (const pinned of manifest.pinnedVersions ?? []) {
    protectedSet.add(pinned);
    if (active) {
      edges.push({ from: active, to: pinned, kind: "pinned" });
    }
  }

  for (const version of classification.rollbackSafeVersions.slice(0, MIN_ROLLBACK_BUFFER)) {
    protectedSet.add(version);
    if (active && version !== active) {
      edges.push({ from: active, to: version, kind: "rollback" });
    }
  }

  return {
    nodes: [...nodes].sort(),
    edges,
    protected: [...protectedSet].sort(),
  };
}

/** @deprecated v5.5 — use buildGcLineageInput */
export function buildSnapshotDependencyGraph(
  manifest: SelectorSnapshotManifest,
  classification: LifecycleClassification,
): GcLineageInput {
  return buildGcLineageInput(manifest, classification);
}

export function isLineageReachableFromActive(
  version: string,
  activeVersion: string,
  lineage: GcLineageInput,
): boolean {
  if (version === activeVersion) return true;
  const visited = new Set<string>();
  const queue = [activeVersion];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of lineage.edges) {
      if (edge.from === current && !visited.has(edge.to)) {
        if (edge.to === version) return true;
        queue.push(edge.to);
      }
    }
  }
  return false;
}

/** @deprecated v5.5 — use isLineageReachableFromActive */
export function isReachableInGraph(
  version: string,
  root: string,
  graph: GcLineageInput,
): boolean {
  return isLineageReachableFromActive(version, root, graph);
}

function eventsFromDecisionAndFallback(input: BuildCausalModelInput): UnifiedCausalEvent[] {
  const graph = buildCausalDecisionGraphInternal(input);
  const events: UnifiedCausalEvent[] = [];
  const edgeMap = new Map<string, string[]>();

  for (const edge of graph.edges) {
    const list = edgeMap.get(edge.from) ?? [];
    list.push(edge.to);
    edgeMap.set(edge.from, list);
  }

  for (const node of graph.nodes) {
    const type: UnifiedCausalEventType =
      node.kind === "decision"
        ? "decision"
        : node.kind === "fallback"
          ? "fallback"
          : node.kind === "gc"
            ? "gc"
            : node.kind === "checkpoint"
              ? "decision"
              : "fallback";

    if (node.kind === "snapshot") continue;

    events.push({
      eventId: node.id,
      type: node.kind === "gc" ? "gc" : type,
      timestamp: Number(node.meta?.pointerEpoch ?? 0) || 0,
      node: node.label,
      edges: [...(edgeMap.get(node.id) ?? [])].sort(),
      metadata: { ...(node.meta ?? {}), kind: node.kind },
    });
  }

  for (const rootId of graph.rootIds) {
    if (!events.some((e) => e.eventId === rootId)) {
      events.push({
        eventId: rootId,
        type: rootId.startsWith("gc:") ? "gc" : rootId.startsWith("fallback:") ? "fallback" : "decision",
        timestamp: 0,
        node: rootId,
        edges: [...(edgeMap.get(rootId) ?? [])].sort(),
        metadata: { kind: "root" },
      });
    }
  }

  return events;
}

function eventsFromTemporalInput(
  manifest: SelectorSnapshotManifest,
  pointer: SelectorSnapshotPointer,
  classification?: LifecycleClassification,
): UnifiedCausalEvent[] {
  const manifestUpdatedAt = parseTimestamp(manifest.updatedAt);
  const pointerUpdatedAt = pointer.updatedAt;
  const recency = sortVersionsByRecency(manifest.versions);
  const activeVersion = pointer.activeVersion || manifest.activeVersion;
  const activeIndex = recency.indexOf(activeVersion);

  const activeAt: Record<number, string> = {
    [pointerUpdatedAt]: activeVersion,
    [manifestUpdatedAt]: activeVersion,
  };

  return recency.map((version, index) => {
    const isArchived = manifest.retention?.[version] === "archived";
    const isProtected =
      classification?.rollbackSafeVersions.includes(version) ||
      version === activeVersion ||
      version === pointer.previousVersion ||
      manifest.pinnedVersions?.includes(version);

    const newerExists = index < activeIndex;
    const validFrom = newerExists
      ? manifestUpdatedAt
      : Math.min(manifestUpdatedAt, pointerUpdatedAt);

    let validUntil: number | null = null;
    if (isArchived && !isProtected) {
      validUntil = manifestUpdatedAt;
    }

    return {
      eventId: `temporal:${version}`,
      type: "temporal" as const,
      timestamp: validFrom,
      node: version,
      edges: validUntil !== null ? [`temporal:expired:${version}`] : [],
      metadata: {
        validFrom: String(validFrom),
        validUntil: validUntil === null ? "" : String(validUntil),
        activeAtPointer: String(pointerUpdatedAt),
        activeAtManifest: String(manifestUpdatedAt),
        activeVersionAtPointer: activeAt[pointerUpdatedAt] ?? activeVersion,
        recencyIndex: String(index),
        activeIndex: String(activeIndex),
      },
    };
  });
}

export function buildUnifiedSelectorCausalModel(
  input: BuildCausalModelInput,
): UnifiedSelectorCausalModel {
  const causalEvents = eventsFromDecisionAndFallback(input);

  let temporalEvents: UnifiedCausalEvent[] = [];
  if (input.temporalManifest && input.temporalPointer) {
    temporalEvents = eventsFromTemporalInput(
      input.temporalManifest,
      input.temporalPointer,
      input.temporalClassification,
    );
  }

  const events = sortEvents([...causalEvents, ...temporalEvents]);
  const rootEventIds = [
    ...new Set(
      events
        .filter((e) => e.type === "decision" || e.type === "fallback")
        .map((e) => e.eventId),
    ),
  ].sort();

  return {
    events,
    rootEventIds,
    builtAt: Date.now(),
  };
}

/** @deprecated v5.5 — use buildUnifiedSelectorCausalModel */
export function buildUnifiedCausalIndex(input: BuildCausalModelInput): UnifiedCausalIndex {
  return buildUnifiedSelectorCausalModel(input);
}

export function queryCausalModel(
  model: UnifiedSelectorCausalModel,
  filter?: CausalModelQueryFilter,
): UnifiedCausalEvent[] {
  if (!filter) return model.events;
  return model.events.filter((event) => {
    if (filter.type && event.type !== filter.type) return false;
    if (filter.nodePrefix && !event.node.startsWith(filter.nodePrefix)) return false;
    return true;
  });
}

/** @deprecated v5.5 */
export function queryUnifiedCausalIndex(
  index: UnifiedCausalIndex,
  filter?: UnifiedCausalQueryFilter,
): UnifiedCausalEvent[] {
  return queryCausalModel(index, filter);
}

export function serializeCausalModel(model: UnifiedSelectorCausalModel): string {
  return JSON.stringify({
    events: model.events,
    rootEventIds: model.rootEventIds,
    builtAt: 0,
  });
}

/** @deprecated v5.5 */
export function serializeUnifiedCausalIndex(index: UnifiedCausalIndex): string {
  return serializeCausalModel(index);
}

export function hashCausalModel(model: UnifiedSelectorCausalModel): string {
  return crypto.createHash("sha256").update(serializeCausalModel(model)).digest("hex");
}

/** @deprecated v5.5 */
export function hashUnifiedCausalIndex(index: UnifiedCausalIndex): string {
  return hashCausalModel(index);
}

export function isGcReachableInCausalModel(
  model: UnifiedSelectorCausalModel,
  fromVersion: string,
  toVersion: string,
): boolean {
  const fromId = `gc:${fromVersion}`;
  const toId = `gc:${toVersion}`;
  const gcEvent = model.events.find((e) => e.eventId === fromId);
  if (!gcEvent) return false;
  if (gcEvent.edges.includes(toId)) return true;
  const visited = new Set<string>();
  const queue = [...gcEvent.edges];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    if (current === toId) return true;
    const next = model.events.find((e) => e.eventId === current);
    if (next) queue.push(...next.edges);
  }
  return false;
}

/** @deprecated v5.5 */
export function isGcReachableInUnifiedIndex(
  index: UnifiedCausalIndex,
  fromVersion: string,
  toVersion: string,
): boolean {
  return isGcReachableInCausalModel(index, fromVersion, toVersion);
}

export function wasSnapshotValidAt(
  version: string,
  timestamp: number,
  model: UnifiedSelectorCausalModel,
): boolean {
  const node = model.events.find((e) => e.type === "temporal" && e.node === version);
  if (!node) return false;

  const validFrom = Number(node.metadata.validFrom ?? 0);
  const validUntilRaw = node.metadata.validUntil ?? "";
  const validUntil = validUntilRaw === "" ? null : Number(validUntilRaw);

  if (timestamp < validFrom) return false;
  if (validUntil !== null && timestamp <= validUntil) return false;

  const activeIndex = Number(node.metadata.activeIndex ?? -1);
  const versionIndex = Number(node.metadata.recencyIndex ?? -1);
  if (activeIndex === -1 || versionIndex === -1) {
    return validUntil === null;
  }

  const pointerUpdatedAt = Number(node.metadata.activeAtPointer ?? 0);
  const manifestUpdatedAt = Number(node.metadata.activeAtManifest ?? 0);
  const activeAt: Record<number, string> = {
    [pointerUpdatedAt]: node.metadata.activeVersionAtPointer ?? "",
    [manifestUpdatedAt]: node.metadata.activeVersionAtPointer ?? "",
  };

  const activeAtTimestamp = Object.keys(activeAt)
    .map(Number)
    .filter((t) => t <= timestamp)
    .sort((a, b) => b - a)[0];

  if (activeAtTimestamp === undefined) {
    return validUntil === null;
  }

  const activeVersion = activeAt[activeAtTimestamp];
  if (!activeVersion) return validUntil === null;

  const activeNode = model.events.find(
    (e) => e.type === "temporal" && e.node === activeVersion,
  );
  if (!activeNode) return false;

  const activeRecencyIndex = Number(activeNode.metadata.recencyIndex ?? -1);
  return versionIndex <= activeRecencyIndex;
}

export function createEmptyCausalModel(): UnifiedSelectorCausalModel {
  return { events: [], rootEventIds: [], builtAt: Date.now() };
}

/** @deprecated v5.5 */
export function createEmptyUnifiedCausalIndex(): UnifiedCausalIndex {
  return createEmptyCausalModel();
}

export type TemporalLineageNode = {
  version: string;
  validFrom: number;
  validUntil: number | null;
};

export type TemporalLineageGraph = {
  nodes: TemporalLineageNode[];
  activeAt: Record<number, string>;
};

export function buildTemporalLineageGraph(
  manifest: SelectorSnapshotManifest,
  pointer: SelectorSnapshotPointer,
  classification?: LifecycleClassification,
): TemporalLineageGraph {
  warnLegacyTemporalGraphAccess("buildTemporalLineageGraph");
  const model = buildUnifiedSelectorCausalModel({
    temporalManifest: manifest,
    temporalPointer: pointer,
    temporalClassification: classification,
  });
  const nodes: TemporalLineageNode[] = model.events
    .filter((e) => e.type === "temporal")
    .map((e) => ({
      version: e.node,
      validFrom: Number(e.metadata.validFrom ?? 0),
      validUntil: e.metadata.validUntil === "" ? null : Number(e.metadata.validUntil),
    }));
  const activeAt: Record<number, string> = {};
  for (const e of model.events.filter((ev) => ev.type === "temporal")) {
    const pointerTs = Number(e.metadata.activeAtPointer ?? 0);
    const manifestTs = Number(e.metadata.activeAtManifest ?? 0);
    const activeVersion = e.metadata.activeVersionAtPointer ?? "";
    if (pointerTs) activeAt[pointerTs] = activeVersion;
    if (manifestTs) activeAt[manifestTs] = activeVersion;
  }
  return { nodes, activeAt };
}

/** Legacy causal graph types for shim re-export */
export type CausalNodeKind = "decision" | "fallback" | "snapshot" | "gc" | "checkpoint";
export type CausalEdgeKind =
  | "decision_input"
  | "fallback_chain"
  | "gc_lineage"
  | "gc_blocked"
  | "dependency";
export type CausalNode = {
  id: string;
  kind: CausalNodeKind;
  label: string;
  meta?: Record<string, string>;
};
export type CausalEdge = { from: string; to: string; kind: CausalEdgeKind };
export type CausalDecisionGraph = {
  nodes: CausalNode[];
  edges: CausalEdge[];
  rootIds: string[];
};
export type BuildCausalGraphInput = BuildCausalModelInput;

function buildCausalDecisionGraphInternal(input: BuildCausalGraphInput): CausalDecisionGraph {
  const nodes: CausalNode[] = [];
  const edges: CausalEdge[] = [];
  const rootIds: string[] = [];

  if (input.decisionTrace) {
    const decisionId = `decision:${input.decisionTrace.traceId}`;
    nodes.push({
      id: decisionId,
      kind: "decision",
      label: input.decisionTrace.traceId,
      meta: {
        contextHash: input.decisionTrace.runtimeContext?.contextHash ?? "",
        snapshotVersion: input.decisionTrace.snapshotVersion ?? "",
      },
    });
    rootIds.push(decisionId);

    if (input.decisionTrace.snapshotVersion) {
      const snapId = `snapshot:${input.decisionTrace.snapshotVersion}`;
      nodes.push({ id: snapId, kind: "snapshot", label: input.decisionTrace.snapshotVersion });
      edges.push({ from: decisionId, to: snapId, kind: "decision_input" });
    }
  }

  if (input.fallbackTrace) {
    const fallbackId = `fallback:${input.fallbackTrace.selectedSource}:${input.fallbackTrace.selectedVersion}`;
    nodes.push({
      id: fallbackId,
      kind: "fallback",
      label: `${input.fallbackTrace.selectedSource}/${input.fallbackTrace.selectedVersion}`,
      meta: { pointerEpoch: String(input.fallbackTrace.pointerEpoch) },
    });
    if (rootIds.length === 0) rootIds.push(fallbackId);

    const snapId = `snapshot:${input.fallbackTrace.selectedVersion}`;
    if (!nodes.some((n) => n.id === snapId)) {
      nodes.push({ id: snapId, kind: "snapshot", label: input.fallbackTrace.selectedVersion });
    }
    edges.push({ from: fallbackId, to: snapId, kind: "fallback_chain" });

    for (const rejected of input.fallbackTrace.rejectedSources) {
      const rejectId = `snapshot:${rejected.version}`;
      if (!nodes.some((n) => n.id === rejectId)) {
        nodes.push({ id: rejectId, kind: "snapshot", label: rejected.version });
      }
      edges.push({ from: fallbackId, to: rejectId, kind: "fallback_chain" });
    }
  }

  const gcGraph = input.gcGraph ?? input.gcLineage;
  if (gcGraph) {
    for (const version of gcGraph.nodes) {
      const gcId = `gc:${version}`;
      nodes.push({ id: gcId, kind: "gc", label: version });
    }
    for (const edge of gcGraph.edges) {
      edges.push({
        from: `gc:${edge.from}`,
        to: `gc:${edge.to}`,
        kind: edge.kind === "lineage" ? "gc_lineage" : "dependency",
      });
    }
    for (const version of gcGraph.protected) {
      edges.push({
        from: `gc:${gcGraph.nodes[0] ?? version}`,
        to: `gc:${version}`,
        kind: "gc_blocked",
      });
    }
  }

  if (input.runtimeContext) {
    const ctxId = `checkpoint:runtime-context:${input.runtimeContext.registryHash.slice(0, 12)}`;
    nodes.push({
      id: ctxId,
      kind: "checkpoint",
      label: "runtime-context",
      meta: {
        pointerEpoch: String(input.runtimeContext.pointerEpoch),
        registryHash: input.runtimeContext.registryHash,
      },
    });
    if (rootIds.length === 0) rootIds.push(ctxId);
  }

  if (input.checkpointPhase) {
    const cpId = `checkpoint:phase:${input.checkpointPhase}`;
    nodes.push({ id: cpId, kind: "checkpoint", label: input.checkpointPhase });
    if (rootIds.length === 0) rootIds.push(cpId);
  }

  return {
    nodes: [...nodes].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges].sort((a, b) => {
      const fromCmp = a.from.localeCompare(b.from);
      if (fromCmp !== 0) return fromCmp;
      const toCmp = a.to.localeCompare(b.to);
      if (toCmp !== 0) return toCmp;
      return a.kind.localeCompare(b.kind);
    }),
    rootIds: [...rootIds].sort(),
  };
}

export function buildCausalDecisionGraph(input: BuildCausalGraphInput): CausalDecisionGraph {
  warnLegacyGraphAccess("buildCausalDecisionGraph");
  return buildCausalDecisionGraphInternal(input);
}

export type PartialCausalGraphInput = {
  traceId?: string;
  snapshotVersion?: string;
  fallbackSource?: string;
  fallbackVersion?: string;
  registryHash?: string;
  pointerEpoch?: number;
  gcVersions?: string[];
};

export function reconstructCausalGraphFromPartial(
  input: PartialCausalGraphInput,
): CausalDecisionGraph {
  const decisionTrace = input.traceId
    ? ({
        traceId: input.traceId,
        snapshotVersion: input.snapshotVersion,
        runtimeContext: input.registryHash
          ? {
              timestamp: 0,
              pointerEpoch: input.pointerEpoch ?? 0,
              registryHash: input.registryHash,
              contextHash: "",
              envFingerprint: "",
            }
          : undefined,
      } as SelectorDecisionTrace)
    : undefined;

  const fallbackTrace =
    input.fallbackSource && input.fallbackVersion
      ? ({
          selectedSource: input.fallbackSource as FallbackTrace["selectedSource"],
          selectedVersion: input.fallbackVersion,
          rejectedSources: [],
          reasonCodes: ["partial_reconstruction"],
          pointerEpoch: input.pointerEpoch ?? 0,
          recordedAt: 0,
          selectionPath: [],
        } as FallbackTrace)
      : undefined;

  const gcGraph = input.gcVersions?.length
    ? { nodes: input.gcVersions, edges: [], protected: input.gcVersions.slice(0, 1) }
    : undefined;

  return buildCausalDecisionGraph({ decisionTrace, fallbackTrace, gcGraph });
}

export function serializeCausalGraph(graph: CausalDecisionGraph): string {
  return JSON.stringify({ nodes: graph.nodes, edges: graph.edges, rootIds: graph.rootIds });
}

export function hashCausalGraph(graph: CausalDecisionGraph): string {
  return crypto.createHash("sha256").update(serializeCausalGraph(graph)).digest("hex");
}
