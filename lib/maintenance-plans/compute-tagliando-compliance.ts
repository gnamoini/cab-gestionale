import type { FullPresetSnapshot } from "@/lib/maintenance-plans/build-full-preset-snapshot";
import type { MaintenanceTask, MaintenanceTaskDiff, MaintenanceTaskKind } from "@/lib/maintenance-plans/maintenance-task";

export const COMPLIANCE_ALGORITHM_VERSION = "v1.0";

const PENALTY: Record<MaintenanceTaskKind, { missing: number; partial: number; extra: number }> = {
  ricambio: { missing: 10, partial: 5, extra: 2 },
  operazione: { missing: 8, partial: 5, extra: 2 },
  checklist: { missing: 5, partial: 3, extra: 2 },
  lubrificazione: { missing: 5, partial: 3, extra: 2 },
  controllo: { missing: 5, partial: 3, extra: 2 },
  misurazione: { missing: 5, partial: 3, extra: 2 },
};

export type TagliandoComplianceResult = {
  algorithmVersion: string;
  auto: number | null;
  diffs: MaintenanceTaskDiff[];
};

function penaltyFor(kind: MaintenanceTaskKind, status: MaintenanceTaskDiff["status"]): number {
  const p = PENALTY[kind];
  if (status === "missing" || status === "unchecked") return p.missing;
  if (status === "partial") return p.partial;
  if (status === "extra") return p.extra;
  return 0;
}

function matchRicambio(expected: MaintenanceTask, executed: MaintenanceTask[]): MaintenanceTask | undefined {
  if (expected.ricambioId) {
    return executed.find((e) => e.kind === "ricambio" && e.ricambioId === expected.ricambioId);
  }
  return executed.find((e) => e.kind === "ricambio" && e.label === expected.label);
}

function compareTasks(
  expected: MaintenanceTask[],
  executed: MaintenanceTask[],
): MaintenanceTaskDiff[] {
  const diffs: MaintenanceTaskDiff[] = [];
  const usedExecuted = new Set<string>();

  for (const exp of expected) {
    if (exp.kind === "ricambio") {
      const act = matchRicambio(exp, executed);
      if (!act) {
        if (exp.isRequired) {
          diffs.push({ taskId: exp.id, kind: exp.kind, label: exp.label, status: "missing" });
        }
        continue;
      }
      usedExecuted.add(act.id);
      const expectedQty = exp.qtyExpected ?? 1;
      const actualQty = act.qtyActual ?? act.qtyExpected ?? 0;
      if (actualQty >= expectedQty) {
        diffs.push({ taskId: exp.id, kind: exp.kind, label: exp.label, status: "ok" });
      } else if (actualQty > 0) {
        diffs.push({
          taskId: exp.id,
          kind: exp.kind,
          label: exp.label,
          status: "partial",
          detail: `Atteso ${expectedQty}, usato ${actualQty}`,
        });
      } else if (exp.isRequired) {
        diffs.push({ taskId: exp.id, kind: exp.kind, label: exp.label, status: "missing" });
      }
      continue;
    }

    if (exp.kind === "checklist") {
      const act = executed.find((e) => e.id === exp.id || (e.kind === "checklist" && e.label === exp.label));
      if (act) usedExecuted.add(act.id);
      const checked = act?.checked === true;
      if (checked) {
        diffs.push({ taskId: exp.id, kind: exp.kind, label: exp.label, status: "ok" });
      } else if (exp.isRequired) {
        diffs.push({ taskId: exp.id, kind: exp.kind, label: exp.label, status: "unchecked" });
      }
      continue;
    }

    const act = executed.find((e) => e.id === exp.id || (e.kind === exp.kind && e.label === exp.label));
    if (act) usedExecuted.add(act.id);
    const done = act?.performed === true;
    if (done) {
      diffs.push({ taskId: exp.id, kind: exp.kind, label: exp.label, status: "ok" });
    } else if (exp.isRequired) {
      diffs.push({ taskId: exp.id, kind: exp.kind, label: exp.label, status: "missing" });
    }
  }

  for (const act of executed) {
    if (usedExecuted.has(act.id)) continue;
    const wasExpected = expected.some(
      (e) =>
        e.id === act.id ||
        (e.kind === act.kind && e.label === act.label) ||
        (e.kind === "ricambio" && act.kind === "ricambio" && e.ricambioId && e.ricambioId === act.ricambioId),
    );
    if (!wasExpected) {
      diffs.push({ taskId: act.id, kind: act.kind, label: act.label, status: "extra" });
    }
  }

  return diffs;
}

/** R1 — calcola compliance solo dallo snapshot persistito, mai dal preset corrente. */
export function computeTagliandoCompliance(
  snapshot: FullPresetSnapshot,
  executedTasks: MaintenanceTask[],
): TagliandoComplianceResult {
  if (!snapshot.tasks.length) {
    return { algorithmVersion: COMPLIANCE_ALGORITHM_VERSION, auto: null, diffs: [] };
  }

  const diffs = compareTasks(snapshot.tasks, executedTasks);
  let score = 100;
  for (const diff of diffs) {
    if (diff.status === "ok") continue;
    score -= penaltyFor(diff.kind, diff.status);
  }
  return {
    algorithmVersion: COMPLIANCE_ALGORITHM_VERSION,
    auto: Math.min(100, Math.max(0, score)),
    diffs,
  };
}
