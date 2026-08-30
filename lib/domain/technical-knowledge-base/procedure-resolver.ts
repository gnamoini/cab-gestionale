import type {
  CatalogActivity,
  InterventoActivityOverride,
  TkbIntervento,

  TkbPublishedSnapshot,
} from "@/lib/domain/technical-knowledge-base/types";

function activityKey(a: CatalogActivity): string {
  return a.activityId;
}

function mergeActivities(base: CatalogActivity[], incoming: CatalogActivity[]): CatalogActivity[] {
  const byId = new Map<string, CatalogActivity>();
  for (const a of base) byId.set(activityKey(a), a);
  for (const a of incoming) byId.set(activityKey(a), a);
  return [...byId.values()].sort((a, b) => a.sort - b.sort || a.activityId.localeCompare(b.activityId));
}

function applyOverrides(
  activities: CatalogActivity[],
  overrides: InterventoActivityOverride[] | undefined,
): CatalogActivity[] {
  if (!overrides?.length) return activities;
  let out = [...activities];
  for (const ov of overrides) {
    if (ov.action === "disable") {
      out = out.filter((a) => a.activityId !== ov.activityId);
    } else if (ov.action === "replace" && ov.replacement) {
      const idx = out.findIndex((a) => a.activityId === ov.activityId);
      if (idx >= 0) {
        out[idx] = { ...ov.replacement, sort: out[idx]!.sort };
      }
    }
  }
  return out;
}

export function resolveInterventoActivities(
  intervento: TkbIntervento,
  snapshot: TkbPublishedSnapshot,
): CatalogActivity[] {
  const procBySlug = new Map(snapshot.procedure.map((p) => [p.slug, p]));
  let merged: CatalogActivity[] = [];

  for (const procSlug of intervento.procedureSlugs ?? []) {
    const proc = procBySlug.get(procSlug);
    if (!proc) continue;
    merged = mergeActivities(merged, [...proc.attivita, ...(proc.controlliFinali ?? [])]);
  }

  merged = applyOverrides(merged, intervento.activityOverrides);
  merged = mergeActivities(merged, [
    ...intervento.attivitaPrincipali,
    ...(intervento.attivitaComplementari ?? []),
    ...(intervento.controlliFinali ?? []),
  ]);

  return merged.sort((a, b) => a.sort - b.sort || a.activityId.localeCompare(b.activityId));
}

export function filterActivitiesByDetailLevel(
  activities: CatalogActivity[],
  detailLevel: import("@/lib/preventivi/description-engine/types").DetailLevel,
): CatalogActivity[] {
  switch (detailLevel) {
    case "compact":
      return activities.filter((a) => a.required);
    case "standard":
      return activities.filter((a) => a.required || a.includeInStandard !== false);
    case "technical":
      return activities;
  }
}

export function operationSortRank(activityType: CatalogActivity["activityType"]): number {
  const map: Record<CatalogActivity["activityType"], number> = {
    diagnosi: 5,
    smontaggio: 10,
    controllo: 25,
    sostituzione: 30,
    pulizia: 35,
    ripristino: 36,
    collaudo: 50,
  };
  return map[activityType] ?? 32;
}

export function sortResolvedActivities(activities: CatalogActivity[]): CatalogActivity[] {
  return [...activities].sort(
    (a, b) =>
      operationSortRank(a.activityType) - operationSortRank(b.activityType) ||
      a.sort - b.sort ||
      a.activityId.localeCompare(b.activityId),
  );
}
