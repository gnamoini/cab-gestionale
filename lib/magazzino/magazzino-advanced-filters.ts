import {
  compatLabelMarcaModello,
  modelliVisibiliPerMarca,
  parseCompatMarcaModello,
} from "@/lib/mezzi/attrezzature-prefs";
import { marcheFromHierarchyTree } from "@/lib/mezzi/hierarchy-list-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

export const FILTER_ALL = "__tutti__" as const;

export type MagazzinoAdvancedFilters = {
  /** Marca attrezzatura (compatibilità). */
  compatMarca: string;
  /** Modello attrezzatura (compatibilità), dipendente da compatMarca. */
  compatModello: string;
  categoria: string;
};

export const MAGAZZINO_ADVANCED_FILTERS_EMPTY: MagazzinoAdvancedFilters = {
  compatMarca: FILTER_ALL,
  compatModello: FILTER_ALL,
  categoria: FILTER_ALL,
};

const GESTIONALE_STORAGE_KEY = "gestionale-magazzino-advanced-filters-v1";

export type MagazzinoFilterCatalog = {
  compatMarche: string[];
  compatModelliByMarca: Record<string, string[]>;
  categorie: string[];
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function dash(v: string): string {
  const t = v.trim();
  return t && t !== "—" ? t : "";
}

function pushUnique(sorted: string[], value: string) {
  const v = value.trim();
  if (!v || v === "—") return;
  if (!sorted.includes(v)) sorted.push(v);
}

export function buildMagazzinoFilterCatalog(
  prodotti: readonly RicambioMagazzino[],
  listePrefs: MezziListePrefs,
  masterCategorie: readonly string[],
): MagazzinoFilterCatalog {
  const compatMarcheSet = new Set<string>(marcheFromHierarchyTree(listePrefs, "attrezzature"));
  const compatModelliByMarca: Record<string, Set<string>> = {};

  for (const marca of compatMarcheSet) {
    compatModelliByMarca[marca] = new Set(modelliVisibiliPerMarca(listePrefs, marca));
  }

  for (const p of prodotti) {
    for (const line of p.compatibilitaMezzi) {
      const { marca, modello } = parseCompatMarcaModello(line);
      if (marca) {
        compatMarcheSet.add(marca);
        if (!compatModelliByMarca[marca]) compatModelliByMarca[marca] = new Set();
        if (modello) compatModelliByMarca[marca]!.add(modello);
      } else if (modello) {
        for (const m of compatMarcheSet) {
          if (!compatModelliByMarca[m]) compatModelliByMarca[m] = new Set();
          compatModelliByMarca[m]!.add(modello);
        }
      }
    }
  }

  const categorie: string[] = [];
  for (const c of masterCategorie) pushUnique(categorie, c);
  for (const p of prodotti) pushUnique(categorie, dash(p.categoria));

  const sortIt = (a: string, b: string) => a.localeCompare(b, "it");
  const modelliRecord: Record<string, string[]> = {};
  for (const marca of [...compatMarcheSet].sort(sortIt)) {
    modelliRecord[marca] = [...(compatModelliByMarca[marca] ?? [])].sort(sortIt);
  }

  return {
    compatMarche: [...compatMarcheSet].sort(sortIt),
    compatModelliByMarca: modelliRecord,
    categorie: categorie.sort(sortIt),
  };
}

function listFilterMatches(selected: string, actual: string): boolean {
  const s = selected.trim();
  if (!s || s === FILTER_ALL) return true;
  return norm(actual) === norm(s);
}

export function magazzinoRowMatchesCompatFilters(
  row: RicambioMagazzino,
  compatMarca: string,
  compatModello: string,
): boolean {
  const marcaSel = compatMarca.trim();
  const modelloSel = compatModello.trim();
  if (
    (!marcaSel || marcaSel === FILTER_ALL) &&
    (!modelloSel || modelloSel === FILTER_ALL)
  ) {
    return true;
  }

  return row.compatibilitaMezzi.some((line) => {
    const { marca, modello } = parseCompatMarcaModello(line);
    if (marcaSel && marcaSel !== FILTER_ALL && norm(marca) !== norm(marcaSel)) return false;
    if (modelloSel && modelloSel !== FILTER_ALL && norm(modello) !== norm(modelloSel)) return false;
    return true;
  });
}

/** Verifica compatibilità esatta marca+modello (per filtro combinato stretto). */
export function magazzinoRowHasCompatLabel(
  row: RicambioMagazzino,
  compatMarca: string,
  compatModello: string,
): boolean {
  if (compatMarca === FILTER_ALL || compatModello === FILTER_ALL) {
    return magazzinoRowMatchesCompatFilters(row, compatMarca, compatModello);
  }
  const label = compatLabelMarcaModello(compatMarca, compatModello);
  return row.compatibilitaMezzi.some((l) => norm(l) === norm(label));
}

export function magazzinoAdvancedFiltersActive(f: MagazzinoAdvancedFilters): boolean {
  return (
    (f.compatMarca.trim() !== "" && f.compatMarca !== FILTER_ALL) ||
    (f.compatModello.trim() !== "" && f.compatModello !== FILTER_ALL) ||
    (f.categoria.trim() !== "" && f.categoria !== FILTER_ALL)
  );
}

export function magazzinoRowMatchesAdvancedFilters(
  row: RicambioMagazzino,
  f: MagazzinoAdvancedFilters,
): boolean {
  if (!listFilterMatches(f.categoria, row.categoria)) return false;
  if (
    f.compatMarca !== FILTER_ALL &&
    f.compatModello !== FILTER_ALL &&
    f.compatMarca.trim() &&
    f.compatModello.trim()
  ) {
    if (!magazzinoRowHasCompatLabel(row, f.compatMarca, f.compatModello)) return false;
  } else if (!magazzinoRowMatchesCompatFilters(row, f.compatMarca, f.compatModello)) {
    return false;
  }
  return true;
}

export function loadMagazzinoAdvancedFiltersPersisted(): MagazzinoAdvancedFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(GESTIONALE_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<MagazzinoAdvancedFilters>;
    return { ...MAGAZZINO_ADVANCED_FILTERS_EMPTY, ...o };
  } catch {
    return null;
  }
}

export function saveMagazzinoAdvancedFiltersPersisted(f: MagazzinoAdvancedFilters): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(GESTIONALE_STORAGE_KEY, JSON.stringify(f));
  } catch {
    /* ignore */
  }
}
