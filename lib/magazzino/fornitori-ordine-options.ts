import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";

/** ponytail: merge O(n) case-insensitive; marche prima dei fornitori alternativi. */
export function mergeFornitoriOrdineOptions(
  mag: Pick<MagazzinoMasterPrefs, "marche" | "fornitori">,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of [...mag.marche, ...mag.fornitori]) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out.sort((a, b) => a.localeCompare(b, "it"));
}
