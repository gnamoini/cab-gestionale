import { parseDecimalInput } from "@/lib/core/decimal-input";
import { resolvePlansForMezzo } from "@/lib/maintenance-plans/resolve-plans-for-mezzo";
import {
  buildTagliandiMatrixRows,
  findServiceAtMilestone,
  isMilestoneApplicable,
  mezzoMatrixAttrezzaturaLabel,
  tagliandiMatrixCellState,
  TAGLIANDI_MATRIX_NO_PLAN_ID,
  TAGLIANDI_MATRIX_STEP_ORE,
  type MaintenanceServiceLite,
} from "@/lib/maintenance-plans/tagliandi-matrix";
import type { MaintenancePlanView } from "@/lib/maintenance-plans/types";
import type { MezzoGestito } from "@/lib/mezzi/types";

/** Anticipo notifica rispetto alla milestone (ore) se non segnata fatta in matrice. */
export const TAGLIANDO_NOTIFICATION_LEAD_ORE = 50;

export function parseSchedaOreLavoro(oreLavoro: string): number {
  const n = parseDecimalInput(oreLavoro);
  return n != null && n >= 0 ? n : 0;
}

export function listOverdueTagliandiMilestonesForRow(input: {
  mezzoId: string;
  planId: string;
  intervalOre: number;
  currentOre: number;
  services: MaintenanceServiceLite[];
}): number[] {
  const { mezzoId, planId, intervalOre, currentOre, services } = input;
  if (currentOre <= 0 || intervalOre <= 0) return [];

  const overdue: number[] = [];
  const maxMilestone = Math.floor(currentOre / intervalOre) * intervalOre;
  for (let milestoneOre = intervalOre; milestoneOre <= maxMilestone; milestoneOre += intervalOre) {
    if (!isMilestoneApplicable(intervalOre, milestoneOre)) continue;
    const svc = findServiceAtMilestone(services, mezzoId, planId, milestoneOre);
    const state = tagliandiMatrixCellState({
      milestoneOre,
      intervalOre,
      currentOre,
      done: Boolean(svc),
    });
    if (state === "overdue") overdue.push(milestoneOre);
  }
  return overdue;
}

/** Milestone non segnate fatte con ore attuali entro lead ore dalla scadenza (o oltre). */
export function listNotifyTagliandiMilestonesForRow(input: {
  mezzoId: string;
  planId: string;
  intervalOre: number;
  currentOre: number;
  services: MaintenanceServiceLite[];
}): number[] {
  const { mezzoId, planId, intervalOre, currentOre, services } = input;
  if (currentOre <= 0 || intervalOre <= 0) return [];

  const notify: number[] = [];
  const maxMilestone =
    Math.ceil((currentOre + TAGLIANDO_NOTIFICATION_LEAD_ORE) / intervalOre) * intervalOre;
  for (let milestoneOre = intervalOre; milestoneOre <= maxMilestone; milestoneOre += intervalOre) {
    if (!isMilestoneApplicable(intervalOre, milestoneOre)) continue;
    const svc = findServiceAtMilestone(services, mezzoId, planId, milestoneOre);
    if (svc) continue;
    if (currentOre >= milestoneOre - TAGLIANDO_NOTIFICATION_LEAD_ORE) {
      notify.push(milestoneOre);
    }
  }
  return notify;
}

export type TagliandoDueEvalResult = {
  earliestOverdueOre: number;
  overdueCount: number;
  currentOre: number;
  attrezzaturaLabel: string;
  cliente: string;
};

export function isMezzoEligibleForTagliandoNotification(_mezzo: MezzoGestito | null | undefined): boolean {
  // ponytail: v1 matrice/notifiche milestone disabilitate.
  return false;
}

export function evaluateTagliandoDueForMezzo(input: {
  mezzo: MezzoGestito | null;
  currentOre: number;
  plans: MaintenancePlanView[];
  catalog: { id: string; label: string }[];
  services: MaintenanceServiceLite[];
}): TagliandoDueEvalResult | null {
  const { mezzo, currentOre, plans, catalog, services } = input;
  if (!mezzo || !isMezzoEligibleForTagliandoNotification(mezzo)) return null;
  if (currentOre <= 0) return null;

  const mezzoForRows: MezzoGestito = { ...mezzo, oreKm: currentOre };
  const rows = buildTagliandiMatrixRows({ mezzi: [mezzoForRows], plans, catalog });
  if (rows.length === 0) return null;

  const allOverdue: number[] = [];
  for (const row of rows) {
    allOverdue.push(
      ...listNotifyTagliandiMilestonesForRow({
        mezzoId: row.mezzoId,
        planId: row.planId,
        intervalOre: row.intervalOre,
        currentOre,
        services,
      }),
    );
  }
  if (allOverdue.length === 0) return null;

  return {
    earliestOverdueOre: Math.min(...allOverdue),
    overdueCount: allOverdue.length,
    currentOre,
    attrezzaturaLabel: mezzoMatrixAttrezzaturaLabel(mezzo),
    cliente: mezzo.cliente?.trim() && mezzo.cliente !== "—" ? mezzo.cliente.trim() : "—",
  };
}

/** Esportato per test — fallback piano 500 h quando nessun piano per tipo. */
export { TAGLIANDI_MATRIX_NO_PLAN_ID, TAGLIANDI_MATRIX_STEP_ORE, resolvePlansForMezzo };
