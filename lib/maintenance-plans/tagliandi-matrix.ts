import { resolvePlansForMezzo } from "@/lib/maintenance-plans/resolve-plans-for-mezzo";
import type { MaintenancePlanView } from "@/lib/maintenance-plans/types";
import { mezzoTagliandiEnabled } from "@/lib/mezzi/mezzi-meta";
import type { MezzoGestito } from "@/lib/mezzi/types";

/** Step colonne matrice (es. 500 h, 1000 h, …). */
export const TAGLIANDI_MATRIX_STEP_ORE = 500;

/** Riga matrice senza piano configurato per il tipo attrezzatura. */
export const TAGLIANDI_MATRIX_NO_PLAN_ID = "__no_plan__";

export function tagliandiMatrixRowHasPlan(row: { planId: string }): boolean {
  return row.planId !== TAGLIANDI_MATRIX_NO_PLAN_ID;
}

export type MaintenanceServiceLite = {
  id: string;
  mezzoId: string;
  planId: string;
  oreAtService: number;
};

export type TagliandiMatrixRow = {
  mezzoId: string;
  mezzoLabel: string;
  cliente: string;
  tipoAttrezzatura: string;
  planId: string;
  planNome: string;
  intervalOre: number;
  currentOre: number;
};

export type TagliandiMatrixCellState = "na" | "done" | "pending" | "overdue";

export function isMilestoneApplicable(intervalOre: number, milestoneOre: number): boolean {
  return milestoneOre > 0 && milestoneOre % intervalOre === 0;
}

export function findServiceAtMilestone(
  services: MaintenanceServiceLite[],
  mezzoId: string,
  planId: string,
  milestoneOre: number,
): MaintenanceServiceLite | null {
  if (planId === TAGLIANDI_MATRIX_NO_PLAN_ID) {
    return services.find((s) => s.mezzoId === mezzoId && s.oreAtService === milestoneOre) ?? null;
  }
  return (
    services.find(
      (s) => s.mezzoId === mezzoId && s.planId === planId && s.oreAtService === milestoneOre,
    ) ?? null
  );
}

/** Piano DB da usare al toggle quando la riga non ha piano dedicato per tipo. */
export function resolveMatrixTogglePlanId(
  row: { planId: string },
  plans: readonly { id: string; isActive: boolean; intervalOre: number }[],
): string | null {
  if (tagliandiMatrixRowHasPlan(row)) return row.planId;
  const active = plans.filter((p) => p.isActive);
  const stepPlan = active.find((p) => p.intervalOre === TAGLIANDI_MATRIX_STEP_ORE);
  return stepPlan?.id ?? active[0]?.id ?? null;
}

export function tagliandiMatrixCellState(input: {
  milestoneOre: number;
  intervalOre: number;
  currentOre: number;
  done: boolean;
}): TagliandiMatrixCellState {
  if (!isMilestoneApplicable(input.intervalOre, input.milestoneOre)) return "na";
  if (input.done) return "done";
  if (input.currentOre >= input.milestoneOre) return "overdue";
  return "pending";
}

export function buildTagliandiMatrixColumnOres(input: {
  rows: TagliandiMatrixRow[];
  services: MaintenanceServiceLite[];
  stepOre?: number;
  minColumns?: number;
  maxColumns?: number;
}): number[] {
  const step = input.stepOre ?? TAGLIANDI_MATRIX_STEP_ORE;
  const minColumns = input.minColumns ?? 4;
  const maxColumns = input.maxColumns ?? 24;
  let maxOre = step;

  for (const row of input.rows) {
    maxOre = Math.max(maxOre, row.currentOre);
    const rowServices = input.services.filter((s) => {
      if (s.mezzoId !== row.mezzoId) return false;
      if (row.planId === TAGLIANDI_MATRIX_NO_PLAN_ID) return true;
      return s.planId === row.planId;
    });
    for (const s of rowServices) {
      maxOre = Math.max(maxOre, s.oreAtService);
    }
    maxOre = Math.max(maxOre, Math.ceil(Math.max(row.currentOre, step) / step) * step);
  }

  const count = Math.min(maxColumns, Math.max(minColumns, Math.ceil(maxOre / step)));
  return Array.from({ length: count }, (_, i) => (i + 1) * step);
}

function mezzoMatrixLabel(m: MezzoGestito): string {
  const marca = m.marca?.trim();
  const modello = m.modello?.trim();
  const att =
    marca && marca !== "—"
      ? modello && modello !== "—"
        ? `${marca} ${modello}`
        : marca
      : modello && modello !== "—"
        ? modello
        : "Mezzo";
  const ident = [m.targa, m.matricola].map((v) => v?.trim()).find((v) => v && v !== "—");
  return ident ? `${att} · ${ident}` : att;
}

export function buildTagliandiMatrixRows(input: {
  mezzi: MezzoGestito[];
  plans: MaintenancePlanView[];
  catalog: { id: string; label: string }[];
}): TagliandiMatrixRow[] {
  const rows: TagliandiMatrixRow[] = [];
  for (const m of input.mezzi) {
    if (m.hubSynthetic) continue;
    if (!mezzoTagliandiEnabled(m)) continue;
    const applicable = resolvePlansForMezzo({
      tipoAttrezzatura: m.tipoAttrezzatura,
      catalog: input.catalog,
      plans: input.plans,
    });
    if (applicable.length === 0) {
      rows.push({
        mezzoId: m.id,
        mezzoLabel: mezzoMatrixLabel(m),
        cliente: m.cliente?.trim() && m.cliente !== "—" ? m.cliente.trim() : "—",
        tipoAttrezzatura:
          m.tipoAttrezzatura?.trim() && m.tipoAttrezzatura !== "—" ? m.tipoAttrezzatura.trim() : "—",
        planId: TAGLIANDI_MATRIX_NO_PLAN_ID,
        planNome: `${TAGLIANDI_MATRIX_STEP_ORE} h`,
        intervalOre: TAGLIANDI_MATRIX_STEP_ORE,
        currentOre: m.oreKm ?? 0,
      });
      continue;
    }
    for (const plan of applicable) {
      rows.push({
        mezzoId: m.id,
        mezzoLabel: mezzoMatrixLabel(m),
        cliente: m.cliente?.trim() && m.cliente !== "—" ? m.cliente.trim() : "—",
        tipoAttrezzatura:
          m.tipoAttrezzatura?.trim() && m.tipoAttrezzatura !== "—" ? m.tipoAttrezzatura.trim() : "—",
        planId: plan.id,
        planNome: plan.nome,
        intervalOre: plan.intervalOre,
        currentOre: m.oreKm ?? 0,
      });
    }
  }
  rows.sort((a, b) => {
    const c = a.cliente.localeCompare(b.cliente, "it");
    if (c !== 0) return c;
    const m = a.mezzoLabel.localeCompare(b.mezzoLabel, "it");
    if (m !== 0) return m;
    return a.planNome.localeCompare(b.planNome, "it");
  });
  return rows;
}
