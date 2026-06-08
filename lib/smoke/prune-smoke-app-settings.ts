import { containsSmokeAuditToken } from "@/lib/smoke/smoke-data-markers";

const FLAT_LIST_KEYS = [
  "clienti",
  "utilizzatori",
  "cantieri",
  "marche",
  "modelli",
  "tipiAttrezzatura",
  "tipiTelaio",
  "produttori",
  "categorie",
  "mezziCompatibili",
  "fornitori",
] as const;

type HierarchyNode = { id?: string; nome?: string; modelli?: { id?: string; nome?: string }[] };

function pruneStringArray(arr: unknown): { next: string[]; removed: number } {
  if (!Array.isArray(arr)) return { next: [], removed: 0 };
  const next: string[] = [];
  let removed = 0;
  for (const item of arr) {
    if (typeof item !== "string") {
      next.push(String(item));
      continue;
    }
    if (containsSmokeAuditToken(item)) {
      removed += 1;
    } else {
      next.push(item);
    }
  }
  return { next, removed };
}

function pruneHierarchy(arr: unknown): { next: HierarchyNode[]; removed: number } {
  if (!Array.isArray(arr)) return { next: [], removed: 0 };
  let removed = 0;
  const next: HierarchyNode[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const marca = raw as HierarchyNode;
    const marcaNome = typeof marca.nome === "string" ? marca.nome : "";
    if (containsSmokeAuditToken(marcaNome)) {
      removed += 1;
      continue;
    }
    const modelliRaw = Array.isArray(marca.modelli) ? marca.modelli : [];
    const keptModelli: { id?: string; nome?: string }[] = [];
    for (const m of modelliRaw) {
      const nome = typeof m?.nome === "string" ? m.nome : "";
      if (containsSmokeAuditToken(nome)) {
        removed += 1;
      } else {
        keptModelli.push(m);
      }
    }
    next.push({ ...marca, modelli: keptModelli });
  }
  return { next, removed };
}

function pruneScontoMap(raw: unknown): { next: Record<string, number>; removed: number } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { next: {}, removed: 0 };
  }
  const next: Record<string, number> = {};
  let removed = 0;
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (containsSmokeAuditToken(key)) {
      removed += 1;
    } else if (typeof val === "number") {
      next[key] = val;
    }
  }
  return { next, removed };
}

export type PruneSmokeAppSettingsResult = {
  next: Record<string, unknown>;
  removedCount: number;
};

/**
 * Rimuove valori smoke (token AUDIT-*) da un payload `app_settings.value` (liste).
 */
export function pruneSmokeAppSettingsValue(value: Record<string, unknown>): PruneSmokeAppSettingsResult {
  const next: Record<string, unknown> = { ...value };
  let removedCount = 0;

  for (const key of FLAT_LIST_KEYS) {
    if (!(key in next)) continue;
    const { next: pruned, removed } = pruneStringArray(next[key]);
    if (removed > 0) next[key] = pruned;
    removedCount += removed;
  }

  for (const key of ["attrezzature", "telai"] as const) {
    if (!(key in next)) continue;
    const { next: pruned, removed } = pruneHierarchy(next[key]);
    if (removed > 0) next[key] = pruned;
    removedCount += removed;
  }

  if ("scontoRicambiByCliente" in next) {
    const { next: pruned, removed } = pruneScontoMap(next.scontoRicambiByCliente);
    if (removed > 0) next.scontoRicambiByCliente = pruned;
    removedCount += removed;
  }

  return { next, removedCount };
}
