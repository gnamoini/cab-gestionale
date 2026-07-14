import type { MaintenancePlanView } from "@/lib/maintenance-plans/types";

export function normalizeTipoAttrezzaturaLabel(label: string): string {
  return label.trim().toLowerCase();
}

export function resolveTipoCatalogId(
  tipoAttrezzatura: string,
  catalog: { id: string; label: string }[],
): string | null {
  const norm = normalizeTipoAttrezzaturaLabel(tipoAttrezzatura);
  if (!norm || norm === "—") return null;
  const hit = catalog.find((c) => normalizeTipoAttrezzaturaLabel(c.label) === norm);
  return hit?.id ?? null;
}

export function filterPlansForTipoId(
  plans: MaintenancePlanView[],
  tipoAttrezzaturaId: string | null,
): MaintenancePlanView[] {
  if (!tipoAttrezzaturaId) return [];
  return plans.filter(
    (p) => p.isActive && p.tipoIds.includes(tipoAttrezzaturaId),
  );
}

export function resolvePlansForMezzo(input: {
  tipoAttrezzatura: string;
  catalog: { id: string; label: string }[];
  plans: MaintenancePlanView[];
}): MaintenancePlanView[] {
  const tipoId = resolveTipoCatalogId(input.tipoAttrezzatura, input.catalog);
  return filterPlansForTipoId(input.plans, tipoId);
}
