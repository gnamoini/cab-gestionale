import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";

/** Chiave stabile per mappa produttori ↔ fornitore (case-insensitive, spazi compressi). */
export function normalizeFornitoreKey(fornitore: string): string {
  return fornitore.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseProduttoriByFornitore(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(o)) {
    const key = normalizeFornitoreKey(k);
    if (!key) continue;
    if (!Array.isArray(v)) continue;
    const list = v
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter((x) => x && x !== "—");
    if (list.length) out[key] = [...new Set(list)];
  }
  return out;
}

export function mergeProduttoriFromMagazzinoMaster(
  prefs: Partial<MagazzinoMasterPrefs> | null | undefined,
): string[] {
  const direct = (prefs?.produttori ?? [])
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => x && x !== "—");
  const legacy: string[] = [];
  if (prefs?.produttoriByFornitore) {
    for (const list of Object.values(prefs.produttoriByFornitore)) {
      for (const p of list) {
        const t = p.trim();
        if (t && t !== "—") legacy.push(t);
      }
    }
  }
  return [...new Set([...direct, ...legacy])].sort((a, b) => a.localeCompare(b, "it"));
}

export function produttoriForFornitore(
  master: MagazzinoMasterPrefs | null | undefined,
  fornitore: string,
): string[] {
  const key = normalizeFornitoreKey(fornitore);
  if (!key || !master?.produttoriByFornitore) return [];
  return master.produttoriByFornitore[key] ?? [];
}

export function renameFornitoreInProduttoriMap(
  map: Record<string, string[]>,
  oldName: string,
  newName: string,
): Record<string, string[]> {
  const oldKey = normalizeFornitoreKey(oldName);
  const newKey = normalizeFornitoreKey(newName);
  if (!oldKey || oldKey === newKey) return map;
  const next = { ...map };
  if (next[oldKey]) {
    next[newKey] = [...new Set([...(next[newKey] ?? []), ...next[oldKey]])];
    delete next[oldKey];
  }
  return next;
}

export function removeFornitoreFromProduttoriMap(
  map: Record<string, string[]>,
  fornitore: string,
): Record<string, string[]> {
  const key = normalizeFornitoreKey(fornitore);
  if (!key || !map[key]) return map;
  const next = { ...map };
  delete next[key];
  return next;
}
