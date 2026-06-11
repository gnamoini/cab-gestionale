/**
 * @advisory v5/v5.1 — offline A/B counterfactual simulation. No runtime coupling.
 */
import { selectorEngineConfig } from "@/lib/selector-core/selector-engine-config";
import type { SelectorOpenEvent } from "@/lib/selector-core/selector-telemetry";
import type {
  CalibrationProfile,
  OptionCountBucket,
  SelectorAbSimulationMetrics,
  SelectorAbSimulationOutcome,
  SelectorAbSimulationVariance,
  SelectorConfigMergeSlice,
  SelectorConfigProposal,
  SheetRolloutStatus,
  TelemetryDistribution,
} from "@/lib/selector-core/types";

export type { SelectorConfigMergeSlice as SelectorConfigSnapshot };

const LARGE_BUCKETS = new Set(["20-100", "100+"]);
const BUCKETS: readonly OptionCountBucket[] = ["2-5", "6-20", "20-100", "100+"];

let simulationBaseSnapshotOverride: SelectorConfigMergeSlice | null = null;

export function setSimulationBaseSnapshot(snapshot: SelectorConfigMergeSlice | null): void {
  simulationBaseSnapshotOverride = snapshot;
}

export function __resetSimulationBaseSnapshotForTests(): void {
  simulationBaseSnapshotOverride = null;
}

export function snapshotCurrentEngineConfig(): SelectorConfigMergeSlice {
  if (simulationBaseSnapshotOverride) {
    return {
      rolloutByDomain: { ...simulationBaseSnapshotOverride.rolloutByDomain },
      sheetMinOptions: simulationBaseSnapshotOverride.sheetMinOptions,
    };
  }
  return {
    rolloutByDomain: { ...selectorEngineConfig.rolloutByDomain },
    sheetMinOptions: selectorEngineConfig.thresholds.sheetMinOptions,
  };
}

export function normalizeTelemetryDistribution(
  events: readonly SelectorOpenEvent[],
): TelemetryDistribution {
  const bucketCounts: Record<OptionCountBucket, number> = {
    "2-5": 0,
    "6-20": 0,
    "20-100": 0,
    "100+": 0,
  };
  const domainCounts: Record<string, number> = {};
  let mobileCount = 0;
  const total = events.length || 1;

  for (const event of events) {
    bucketCounts[event.optionCountBucket] = (bucketCounts[event.optionCountBucket] ?? 0) + 1;
    const domain = event.domain?.trim() || "unknown";
    domainCounts[domain] = (domainCounts[domain] ?? 0) + 1;
    if (event.isMobile) mobileCount += 1;
  }

  const bucketShares = {} as Record<OptionCountBucket, number>;
  for (const bucket of BUCKETS) {
    bucketShares[bucket] = (bucketCounts[bucket] ?? 0) / total;
  }

  const domainShares: Record<string, number> = {};
  for (const [domain, count] of Object.entries(domainCounts)) {
    domainShares[domain] = count / total;
  }

  return {
    bucketShares,
    mobileShare: mobileCount / total,
    domainShares,
  };
}

export function buildCalibrationProfile(events: readonly SelectorOpenEvent[]): CalibrationProfile {
  return {
    distribution: normalizeTelemetryDistribution(events),
    totalEvents: events.length,
  };
}

function computeEventWeight(
  event: SelectorOpenEvent,
  profile: CalibrationProfile,
  targetDomain: string,
): number {
  const dist = profile.distribution;
  const bucketWeight = dist.bucketShares[event.optionCountBucket] ?? 0.01;
  const mobileWeight = event.isMobile ? dist.mobileShare : 1 - dist.mobileShare;
  const domainWeight =
    event.domain === targetDomain ? (dist.domainShares[targetDomain] ?? 0.01) : 0.01;
  return Math.max(0.001, bucketWeight * mobileWeight * domainWeight);
}

export function trackSimulationVariance(
  events: readonly SelectorOpenEvent[],
  proposal: SelectorConfigProposal,
): SelectorAbSimulationVariance {
  const domainEvents = events.filter((e) => e.domain === proposal.targetDomain);
  const realDist = normalizeTelemetryDistribution(domainEvents);
  const uniformShare = domainEvents.length > 0 ? 1 / BUCKETS.length : 0;

  let bucketDrift = 0;
  for (const bucket of BUCKETS) {
    bucketDrift += Math.abs((realDist.bucketShares[bucket] ?? 0) - uniformShare);
  }
  bucketDrift /= BUCKETS.length;

  const simulatedMobileShare = 0.5;
  const mobileShareDrift = Math.abs(realDist.mobileShare - simulatedMobileShare);

  return { bucketDrift, mobileShareDrift };
}

function isRolloutEnabled(status: SheetRolloutStatus | undefined): boolean {
  if (!status) return false;
  if (status === "ENABLED") return true;
  if (status === "DISABLED") return false;
  return status === "PARTIAL" || status === "GRADUAL";
}

function applyProposalSnapshot(
  base: SelectorConfigMergeSlice,
  proposal: SelectorConfigProposal,
): SelectorConfigMergeSlice {
  const rolloutByDomain = { ...base.rolloutByDomain };
  if (proposal.proposedChange.rolloutAdjustment) {
    rolloutByDomain[proposal.targetDomain] = proposal.proposedChange.rolloutAdjustment;
  }
  return {
    rolloutByDomain,
    sheetMinOptions:
      proposal.proposedChange.thresholdAdjustment ?? base.sheetMinOptions,
  };
}

function counterfactualSurface(
  event: SelectorOpenEvent,
  proposal: SelectorConfigProposal,
  snapshot: SelectorConfigMergeSlice,
): SelectorOpenEvent["surface"] {
  const preference = proposal.proposedChange.surfacePreference ?? event.surface;
  const domainRollout = snapshot.rolloutByDomain[proposal.targetDomain];

  if (preference === "sheet") {
    const bucketLarge = LARGE_BUCKETS.has(event.optionCountBucket);
    const eligible =
      event.isMobile &&
      bucketLarge &&
      isRolloutEnabled(domainRollout ?? proposal.proposedChange.rolloutAdjustment);
    return eligible ? "sheet" : preference;
  }

  return preference;
}

function computeMetrics(events: readonly SelectorOpenEvent[]): SelectorAbSimulationMetrics {
  if (events.length === 0) {
    return { searchEfficiency: 0, dropdownEfficiency: 0, fallbackRate: 0 };
  }

  let searchHits = 0;
  let dropdownWeighted = 0;
  let fallbackCount = 0;
  let latencySum = 0;

  for (const event of events) {
    if (event.searchUsed && event.surface !== "dropdown") searchHits += 1;
    if (event.surface === "dropdown") {
      dropdownWeighted += 1 / Math.max(1, event.decisionLatencyMs);
    }
    if (event.fallbackUsed) fallbackCount += 1;
    latencySum += event.decisionLatencyMs;
  }

  const avgLatency = latencySum / events.length;

  return {
    searchEfficiency: searchHits / events.length,
    dropdownEfficiency: dropdownWeighted / events.length / (1 / Math.max(1, avgLatency)),
    fallbackRate: fallbackCount / events.length,
  };
}

function computeWeightedMetrics(
  events: readonly SelectorOpenEvent[],
  weights: readonly number[],
): SelectorAbSimulationMetrics {
  if (events.length === 0) {
    return { searchEfficiency: 0, dropdownEfficiency: 0, fallbackRate: 0 };
  }

  let weightSum = 0;
  let searchHits = 0;
  let dropdownWeighted = 0;
  let fallbackCount = 0;

  for (let i = 0; i < events.length; i += 1) {
    const event = events[i]!;
    const w = weights[i] ?? 1;
    weightSum += w;
    if (event.searchUsed && event.surface !== "dropdown") searchHits += w;
    if (event.surface === "dropdown") {
      dropdownWeighted += w / Math.max(1, event.decisionLatencyMs);
    }
    if (event.fallbackUsed) fallbackCount += w;
  }

  const total = weightSum || 1;

  return {
    searchEfficiency: searchHits / total,
    dropdownEfficiency: dropdownWeighted / total,
    fallbackRate: fallbackCount / total,
  };
}

function computeMetricsWithCounterfactual(
  events: readonly SelectorOpenEvent[],
  assignSurface: (event: SelectorOpenEvent) => SelectorOpenEvent["surface"],
  weights?: readonly number[],
): SelectorAbSimulationMetrics {
  const counterfactual = events.map((event) => ({
    ...event,
    surface: assignSurface(event),
    fallbackUsed: event.fallbackUsed && assignSurface(event) === event.surface ? true : false,
  }));

  if (weights && weights.length === events.length) {
    return computeWeightedMetrics(counterfactual, weights);
  }

  let searchHits = 0;
  let dropdownWeighted = 0;
  let fallbackCount = 0;

  for (const event of counterfactual) {
    const effectiveSearch =
      event.searchUsed && (event.surface === "sheet" || event.surface === "searchableDropdown");
    if (effectiveSearch) searchHits += 1;
    if (event.surface === "dropdown") {
      dropdownWeighted += 1 / Math.max(1, event.decisionLatencyMs);
    }
    if (event.fallbackUsed) fallbackCount += 1;
  }

  const total = counterfactual.length || 1;

  return {
    searchEfficiency: searchHits / total,
    dropdownEfficiency: dropdownWeighted / total,
    fallbackRate: fallbackCount / total,
  };
}

export function simulateCurrentConfig(
  events: readonly SelectorOpenEvent[],
  options?: { calibrationMode?: boolean; calibrationProfile?: CalibrationProfile },
): SelectorAbSimulationMetrics {
  if (options?.calibrationMode && options.calibrationProfile && events.length > 0) {
    const domain = events[0]?.domain ?? "unknown";
    const weights = events.map((e) =>
      computeEventWeight(e, options.calibrationProfile!, domain),
    );
    return computeWeightedMetrics(events, weights);
  }
  return computeMetrics(events);
}

export function simulateProposedConfig(
  events: readonly SelectorOpenEvent[],
  proposal: SelectorConfigProposal,
  options?: { calibrationMode?: boolean; calibrationProfile?: CalibrationProfile },
): SelectorAbSimulationMetrics {
  const snapshot = applyProposalSnapshot(snapshotCurrentEngineConfig(), proposal);
  const domainEvents = events.filter((e) => e.domain === proposal.targetDomain);

  if (domainEvents.length === 0) {
    return { searchEfficiency: 0, dropdownEfficiency: 0, fallbackRate: 0 };
  }

  const weights =
    options?.calibrationMode && options.calibrationProfile
      ? domainEvents.map((e) =>
          computeEventWeight(e, options.calibrationProfile!, proposal.targetDomain),
        )
      : undefined;

  return computeMetricsWithCounterfactual(
    domainEvents,
    (event) => counterfactualSurface(event, proposal, snapshot),
    weights,
  );
}

export type CompareOutcomesOptions = {
  calibrationMode?: boolean;
  calibrationProfile?: CalibrationProfile;
};

export function compareOutcomes(
  events: readonly SelectorOpenEvent[],
  proposal: SelectorConfigProposal,
  options?: CompareOutcomesOptions,
): SelectorAbSimulationOutcome {
  const domainEvents = events.filter((e) => e.domain === proposal.targetDomain);
  const profile = options?.calibrationProfile ?? buildCalibrationProfile(domainEvents);
  const simOptions = options?.calibrationMode
    ? { calibrationMode: true, calibrationProfile: profile }
    : undefined;

  const current = simulateCurrentConfig(domainEvents, simOptions);
  const proposed = simulateProposedConfig(events, proposal, simOptions);
  const fallbackReductionPotential = Math.max(0, current.fallbackRate - proposed.fallbackRate);

  const searchGain = proposed.searchEfficiency - current.searchEfficiency;
  const latencyPenalty =
    proposed.dropdownEfficiency < current.dropdownEfficiency * 0.95 ? 0.05 : 0;

  let recommendation: SelectorAbSimulationOutcome["recommendation"] = "inconclusive";
  if (searchGain + fallbackReductionPotential - latencyPenalty > 0.05) {
    recommendation = "favor_proposed";
  } else if (searchGain + fallbackReductionPotential < -0.05) {
    recommendation = "favor_current";
  }

  return {
    proposalId: proposal.id,
    current,
    proposed,
    fallbackReductionPotential,
    recommendation,
    varianceVsReal: trackSimulationVariance(events, proposal),
  };
}

export function compareAllProposals(
  events: readonly SelectorOpenEvent[],
  proposals: readonly SelectorConfigProposal[],
  options?: CompareOutcomesOptions,
): SelectorAbSimulationOutcome[] {
  return proposals.map((proposal) => compareOutcomes(events, proposal, options));
}
