import { ATTREZZATURE_COLUMNS } from "@/lib/db/table-select-columns";
import { compatLabelMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import type { AttrezzaturaMarca } from "@/lib/mezzi/attrezzature-prefs";
import type { AttrezzaturaRow } from "@/src/types/supabase-tables";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AttrezzatureCatalogEntry = {
  marca: string;
  modello: string;
  tipoAttrezzatura: string | null;
};

/** Distinct marca/modello dalla flotta reale (tabella attrezzature). */
export async function fetchAttrezzatureCatalogEntries(
  sb: SupabaseClient,
): Promise<AttrezzatureCatalogEntry[]> {
  const { data, error } = await sb.from("attrezzature").select(ATTREZZATURE_COLUMNS);
  if (error) throw new Error(error.message);
  const seen = new Set<string>();
  const out: AttrezzatureCatalogEntry[] = [];
  for (const row of (data ?? []) as AttrezzaturaRow[]) {
    const marca = row.marca?.trim();
    const modello = row.modello?.trim();
    if (!marca) continue;
    const key = `${marca.toLowerCase()}|${(modello ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      marca,
      modello: modello || "—",
      tipoAttrezzatura: row.tipo_attrezzatura?.trim() || null,
    });
  }
  return out.sort((a, b) =>
    `${a.marca} ${a.modello}`.localeCompare(`${b.marca} ${b.modello}`, "it"),
  );
}

/** Albero marca/modello per UI compat (V2 flotta). */
export function attrezzatureCatalogToHierarchyTree(entries: readonly AttrezzatureCatalogEntry[]): AttrezzaturaMarca[] {
  const byMarca = new Map<string, Set<string>>();
  for (const e of entries) {
    const modelli = byMarca.get(e.marca) ?? new Set<string>();
    if (e.modello && e.modello !== "—") modelli.add(e.modello);
    byMarca.set(e.marca, modelli);
  }
  return [...byMarca.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "it"))
    .map(([nome, modelli], idx) => ({
      id: `fleet-marca-${idx}`,
      nome,
      modelli: [...modelli]
        .sort((a, b) => a.localeCompare(b, "it"))
        .map((modelloNome, j) => ({ id: `fleet-mod-${idx}-${j}`, nome: modelloNome })),
    }));
}

export function compatLabelsFromCatalog(entries: readonly AttrezzatureCatalogEntry[]): string[] {
  return entries.map((e) => compatLabelMarcaModello(e.marca, e.modello));
}

/** ponytail: prefs ID stabili per compat refs; flotta aggiunge solo modelli mancanti. */
export function resolveMezziListeWithFleetCatalog(
  baseListe: import("@/lib/mezzi/mezzi-liste-prefs-storage").MezziListePrefs,
  fleetTree: readonly AttrezzaturaMarca[],
): import("@/lib/mezzi/mezzi-liste-prefs-storage").MezziListePrefs {
  if (fleetTree.length === 0) return baseListe;
  return {
    ...baseListe,
    attrezzature: mergeAttrezzatureMarcheTrees(fleetTree, baseListe.attrezzature ?? []),
  };
}

/** Unisce albero prefs (ID stabili) con flotta V2 (modelli aggiuntivi). */
export function mergeAttrezzatureMarcheTrees(
  fleet: readonly AttrezzaturaMarca[],
  prefs: readonly AttrezzaturaMarca[],
): AttrezzaturaMarca[] {
  const byName = new Map<string, AttrezzaturaMarca>();
  const ingest = (m: AttrezzaturaMarca) => {
    const key = m.nome.trim().toLowerCase();
    if (!key) return;
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, { id: m.id, nome: m.nome.trim(), modelli: [...m.modelli] });
      return;
    }
    const seen = new Set(existing.modelli.map((x) => x.nome.trim().toLowerCase()));
    for (const mod of m.modelli) {
      const mn = mod.nome.trim();
      if (!mn) continue;
      const mk = mn.toLowerCase();
      if (seen.has(mk)) continue;
      seen.add(mk);
      existing.modelli.push({ id: mod.id, nome: mn });
    }
  };
  for (const m of prefs) ingest(m);
  for (const m of fleet) ingest(m);
  return [...byName.values()].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}
