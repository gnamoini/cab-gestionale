import type { CatalogMacchina, CatalogMarca } from "@/lib/documenti/documenti-catalog-types";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { MezzoGestito } from "@/lib/mezzi/types";

function slug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/gi, "");
}

function marcaKey(nome: string): string {
  return nome.trim().toLowerCase();
}

type MarcaAccum = { nome: string; modelli: Set<string> };

/**
 * Catalogo marche / modelli per la pagina Documenti: gerarchia attrezzature (impostazioni globali)
 * + anagrafica mezzi, allineato alle select di inserimento (`GlobalHierarchy*`).
 */
export function buildDocumentiCatalogFromImpostazioni(prefs: MezziListePrefs, mezzi: MezzoGestito[]): CatalogMarca[] {
  const p = migrateMezziListePrefs(prefs);
  const byKey = new Map<string, MarcaAccum>();

  const ensureMarca = (rawNome: string): MarcaAccum | null => {
    const nome = rawNome.trim();
    if (!nome) return null;
    const key = marcaKey(nome);
    let hit = byKey.get(key);
    if (!hit) {
      hit = { nome, modelli: new Set() };
      byKey.set(key, hit);
    }
    return hit;
  };

  const addModello = (marcaNome: string, modelloNome: string) => {
    const mo = modelloNome.trim();
    if (!mo) return;
    const mar = ensureMarca(marcaNome);
    mar?.modelli.add(mo);
  };

  for (const m of p.attrezzature ?? []) {
    const mar = ensureMarca(m.nome);
    if (!mar) continue;
    for (const mod of m.modelli) addModello(mar.nome, mod.nome);
  }

  for (const nome of p.marche) ensureMarca(nome);

  for (const z of mezzi) {
    const mar = ensureMarca(z.marca ?? "");
    if (!mar) continue;
    addModello(mar.nome, z.modello ?? "");
  }

  const sorted = [...byKey.values()].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  return sorted.map(({ nome, modelli }) => {
    const marcaSlug = slug(nome) || "senza-marca";
    const modelliSorted = [...modelli].sort((a, b) => a.localeCompare(b, "it"));
    const macchine: CatalogMacchina[] = modelliSorted.map((mn) => ({
      id: `mdl-${marcaSlug}__${slug(mn)}`,
      nome: mn,
    }));
    return {
      id: `marca-${marcaSlug}`,
      nome,
      macchine,
    };
  });
}

export function mezziForMarcaModello(mezzi: MezzoGestito[], marcaNome: string, modelloNome: string): MezzoGestito[] {
  const mn = marcaNome.trim().toLowerCase();
  const mod = modelloNome.trim().toLowerCase();
  return mezzi.filter((z) => z.marca.trim().toLowerCase() === mn && z.modello.trim().toLowerCase() === mod);
}
