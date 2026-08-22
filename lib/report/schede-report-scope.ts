import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

export type SchedeScopeKind =
  | "completed_in_period"
  | "hours_in_period"
  | "cross_completed_in_period";

export type SchedeConsumerScope = {
  needsLaborCost?: SchedeScopeKind;
  needsMargin?: SchedeScopeKind;
  needsActualHours?: SchedeScopeKind;
};

export type SchedeScopeInput = {
  completate: readonly LavorazioneArchiviata[];
  lavListRows: readonly Pick<LavorazioneListRow, "id" | "actual_labor_hours">[];
  range: DateRange;
};

function idsCompletedInPeriod(
  completate: readonly LavorazioneArchiviata[],
  range: DateRange,
): string[] {
  const ids: string[] = [];
  for (const c of completate) {
    if (c.dataCompletamento && isoInRange(c.dataCompletamento, range)) {
      ids.push(c.id);
    }
  }
  return ids;
}

function idsHoursInPeriod(
  completate: readonly LavorazioneArchiviata[],
  lavListRows: readonly Pick<LavorazioneListRow, "id" | "actual_labor_hours">[],
  range: DateRange,
): string[] {
  const byId = new Map(lavListRows.map((r) => [r.id, r]));
  const ids: string[] = [];
  for (const c of completate) {
    if (!c.dataCompletamento || !isoInRange(c.dataCompletamento, range)) continue;
    const hours = Number(byId.get(c.id)?.actual_labor_hours ?? 0);
    if (Number.isFinite(hours) && hours > 0) ids.push(c.id);
  }
  return ids;
}

function resolveScopeKind(
  kind: SchedeScopeKind,
  input: SchedeScopeInput,
): string[] {
  switch (kind) {
    case "completed_in_period":
    case "cross_completed_in_period":
      return idsCompletedInPeriod(input.completate, input.range);
    case "hours_in_period":
      return idsHoursInPeriod(input.completate, input.lavListRows, input.range);
    default:
      return [];
  }
}

/** Union degli id lavorazione per gli scope richiesti dai consumer attivi. */
export function resolveSchedeLavorazioneIds(
  input: SchedeScopeInput,
  scopes: SchedeConsumerScope,
): string[] {
  const set = new Set<string>();
  const kinds: (SchedeScopeKind | undefined)[] = [
    scopes.needsLaborCost,
    scopes.needsMargin,
    scopes.needsActualHours,
  ];
  for (const kind of kinds) {
    if (!kind) continue;
    for (const id of resolveScopeKind(kind, input)) {
      set.add(id);
    }
  }
  return [...set];
}

/** Scope aggregato per requirements gate Report. */
export function mergeSchedeConsumerScopes(
  scopes: readonly SchedeConsumerScope[],
): SchedeConsumerScope {
  const out: SchedeConsumerScope = {};
  for (const s of scopes) {
    if (s.needsLaborCost) out.needsLaborCost = s.needsLaborCost;
    if (s.needsMargin) out.needsMargin = s.needsMargin;
    if (s.needsActualHours) out.needsActualHours = s.needsActualHours;
  }
  return out;
}
