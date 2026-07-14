import type { HealthScoreConfig } from "@/lib/health-score/config/schema";
import type { InputSnapshot } from "@/lib/health-score/types";

export function resolveDependencyFactor(
  kpiId: string,
  config: HealthScoreConfig,
  snapshot: InputSnapshot,
  kpiResults: Map<string, { kpiScore: number; effectiveWeight: number }>,
): number {
  const dep = config.dependencies.find((d) => d.kpiId === kpiId);
  if (!dep) return 1;

  if (dep.rule === "suppress_if_completate_zero") {
    const completate = kpiResults.get("completate");
    if (!completate || snapshot.closed === 0) return 0;
    return 1;
  }

  if (dep.rule === "downweight_if_backlog_high") {
    const threshold = dep.backlogThreshold ?? 50;
    if (snapshot.backlog > threshold) return 0.5;
    return 1;
  }

  if (dep.rule === "cap_weight_by_backlog_ratio") {
    const ratio = Math.min(1, snapshot.backlog / Math.max(thresholdFromDep(dep), 1));
    return ratio;
  }

  return 1;
}

function thresholdFromDep(dep: { backlogThreshold?: number }): number {
  return dep.backlogThreshold ?? 50;
}

export function resolveDynamicWeight(kpiId: string, snapshot: InputSnapshot): number {
  if (kpiId === "close-time") {
    return Math.min(1, Math.sqrt(snapshot.backlog / 50));
  }
  if (kpiId === "fatturato" || kpiId === "incassato" || kpiId === "preventivi-emessi") {
    return Math.min(1, Math.sqrt(snapshot.closed / 20));
  }
  if (kpiId === "mag-movements") {
    return Math.min(1, snapshot.stockCritical / 100 + 0.3);
  }
  if (kpiId === "urgent-turnaround") {
    return snapshot.urgentSampleSize > 0 ? 1 : 0;
  }
  return 1;
}
