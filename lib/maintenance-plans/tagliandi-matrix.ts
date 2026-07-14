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
  /** Marca + modello attrezzatura. */
  attrezzaturaLabel: string;
  cliente: string;
  tipoAttrezzatura: string;
  numeroScuderia: string | null;
  identKind: TagliandiMatrixIdentKind | null;
  identValue: string | null;
  planId: string;
  planNome: string;
  intervalOre: number;
  currentOre: number;
};

export type TagliandiMatrixIdentKind = "targa" | "matricola";

export const TAGLIANDI_MATRIX_IDENT_LABEL: Record<TagliandiMatrixIdentKind, string> = {
  targa: "Targa",
  matricola: "Matricola",
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
  /** Milestone sempre presenti in testata (es. 7500, 8000). */
  ensureOres?: number[];
}): number[] {
  const step = input.stepOre ?? TAGLIANDI_MATRIX_STEP_ORE;
  const minColumns = input.minColumns ?? 4;
  const maxColumns = input.maxColumns ?? 24;
  const ensureOres = (input.ensureOres ?? []).filter((o) => o > 0);
  let maxOre = step;

  const servicesByMezzo = new Map<string, MaintenanceServiceLite[]>();
  const servicesByMezzoPlan = new Map<string, MaintenanceServiceLite[]>();
  for (const s of input.services) {
    const mezzoBucket = servicesByMezzo.get(s.mezzoId);
    if (mezzoBucket) mezzoBucket.push(s);
    else servicesByMezzo.set(s.mezzoId, [s]);

    const planKey = `${s.mezzoId}:${s.planId}`;
    const planBucket = servicesByMezzoPlan.get(planKey);
    if (planBucket) planBucket.push(s);
    else servicesByMezzoPlan.set(planKey, [s]);
  }

  for (const row of input.rows) {
    maxOre = Math.max(maxOre, row.currentOre);
    const rowServices =
      row.planId === TAGLIANDI_MATRIX_NO_PLAN_ID
        ? (servicesByMezzo.get(row.mezzoId) ?? [])
        : (servicesByMezzoPlan.get(`${row.mezzoId}:${row.planId}`) ?? []);
    for (const s of rowServices) {
      maxOre = Math.max(maxOre, s.oreAtService);
    }
    maxOre = Math.max(maxOre, Math.ceil(Math.max(row.currentOre, step) / step) * step);
  }
  for (const ore of ensureOres) {
    maxOre = Math.max(maxOre, ore);
  }

  const ensureMinSlots =
    ensureOres.length > 0 ? Math.max(...ensureOres.map((o) => Math.ceil(o / step))) : 0;
  const count = Math.min(maxColumns, Math.max(minColumns, ensureMinSlots, Math.ceil(maxOre / step)));
  const cols = Array.from({ length: count }, (_, i) => (i + 1) * step);
  for (const ore of ensureOres) {
    if (!cols.includes(ore) && isMilestoneApplicable(step, ore)) {
      cols.push(ore);
    }
  }
  cols.sort((a, b) => a - b);
  return cols.length > maxColumns ? cols.slice(0, maxColumns) : cols;
}

function cleanIdentValue(v: string | undefined | null): string | null {
  const t = v?.trim();
  if (!t || t === "—" || t === "Non assegnata") return null;
  return t;
}

export function mezzoMatrixAttrezzaturaLabel(m: MezzoGestito): string {
  const marca = m.marca?.trim();
  const modello = m.modello?.trim();
  if (marca && marca !== "—") {
    return modello && modello !== "—" ? `${marca} ${modello}` : marca;
  }
  if (modello && modello !== "—") return modello;
  return "Mezzo";
}

/** Targa → matricola (scuderia in colonna dedicata). */
export function mezzoMatrixIdent(
  m: MezzoGestito,
): { kind: TagliandiMatrixIdentKind; value: string } | null {
  const targa = cleanIdentValue(m.targa);
  if (targa) return { kind: "targa", value: targa };
  const matricola = cleanIdentValue(m.matricola);
  if (matricola) return { kind: "matricola", value: matricola };
  return null;
}

function matrixRowFromMezzo(m: MezzoGestito, plan: {
  planId: string;
  planNome: string;
  intervalOre: number;
}): TagliandiMatrixRow {
  const ident = mezzoMatrixIdent(m);
  return {
    mezzoId: m.id,
    attrezzaturaLabel: mezzoMatrixAttrezzaturaLabel(m),
    cliente: m.cliente?.trim() && m.cliente !== "—" ? m.cliente.trim() : "—",
    tipoAttrezzatura:
      m.tipoAttrezzatura?.trim() && m.tipoAttrezzatura !== "—" ? m.tipoAttrezzatura.trim() : "—",
    numeroScuderia: cleanIdentValue(m.numeroScuderia),
    identKind: ident?.kind ?? null,
    identValue: ident?.value ?? null,
    planId: plan.planId,
    planNome: plan.planNome,
    intervalOre: plan.intervalOre,
    currentOre: m.oreKm ?? 0,
  };
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
      rows.push(
        matrixRowFromMezzo(m, {
          planId: TAGLIANDI_MATRIX_NO_PLAN_ID,
          planNome: `${TAGLIANDI_MATRIX_STEP_ORE} h`,
          intervalOre: TAGLIANDI_MATRIX_STEP_ORE,
        }),
      );
      continue;
    }
    for (const plan of applicable) {
      rows.push(
        matrixRowFromMezzo(m, {
          planId: plan.id,
          planNome: plan.nome,
          intervalOre: plan.intervalOre,
        }),
      );
    }
  }
  rows.sort((a, b) => {
    const c = a.cliente.localeCompare(b.cliente, "it");
    if (c !== 0) return c;
    const m = a.attrezzaturaLabel.localeCompare(b.attrezzaturaLabel, "it");
    if (m !== 0) return m;
    return a.planNome.localeCompare(b.planNome, "it");
  });
  return rows;
}
