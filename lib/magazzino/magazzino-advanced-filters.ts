import {
  compatLabelMarcaModello,
  modelliVisibiliPerMarca,
  parseCompatMarcaModello,
} from "@/lib/mezzi/attrezzature-prefs";
import {
  marcheFromHierarchyTree,
  modelliVisibiliPerMarcaHierarchy,
  type HierarchyTreeKey,
} from "@/lib/mezzi/hierarchy-list-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { isRicambioCompatUniversal } from "@/lib/magazzino/compat/compat-normalize";
import { readCompatLabelsForUi } from "@/lib/magazzino/compat/compat-read-guard";
import {
  dedupeCompatRefs,
  isCompatMarcaUniversalLine,
  labelsToCompatRefs,
  resolveCompatRefLabel,
  type RicambioCompatRef,
} from "@/lib/magazzino/ricambio-compat-resolver";

export const FILTER_ALL = "__tutti__" as const;

export type MagazzinoAdvancedFilters = {
  /** Marca attrezzatura (compatibilità). */
  compatMarca: string;
  /** Modello attrezzatura (compatibilità), dipendente da compatMarca. */
  compatModello: string;
  /** Marca telaio (compatibilità). */
  telaioMarca: string;
  /** Modello telaio (compatibilità), dipendente da telaioMarca. */
  telaioModello: string;
  /** Marca ricambio (anagrafica prodotto). */
  marcaRicambio: string;
  categoria: string;
  fornitoreNonOriginale: string;
};

export const MAGAZZINO_ADVANCED_FILTERS_EMPTY: MagazzinoAdvancedFilters = {
  compatMarca: FILTER_ALL,
  compatModello: FILTER_ALL,
  telaioMarca: FILTER_ALL,
  telaioModello: FILTER_ALL,
  marcaRicambio: FILTER_ALL,
  categoria: FILTER_ALL,
  fornitoreNonOriginale: FILTER_ALL,
};

const GESTIONALE_STORAGE_KEY = "gestionale-magazzino-advanced-filters-v1";

export type MagazzinoFilterCatalog = {
  compatMarche: string[];
  compatModelliByMarca: Record<string, string[]>;
  telaioMarche: string[];
  telaioModelliByMarca: Record<string, string[]>;
  categorie: string[];
  fornitoriNonOriginali: string[];
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function resolvedCompatLabels(row: RicambioMagazzino, listePrefs?: MezziListePrefs): string[] {
  return readCompatLabelsForUi(row, listePrefs, "magazzino-advanced-filters.resolvedCompatLabels");
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

function rowCompatRefs(row: RicambioMagazzino, listePrefs: MezziListePrefs): RicambioCompatRef[] {
  if (row.compatibilitaRefs?.length) {
    return dedupeCompatRefs(row.compatibilitaRefs);
  }
  return labelsToCompatRefs(resolvedCompatLabels(row, listePrefs), listePrefs);
}

function refsForTree(refs: readonly RicambioCompatRef[], tree: HierarchyTreeKey): RicambioCompatRef[] {
  return refs.filter((ref) => ref.tree === tree);
}

function treeCompatLabels(
  row: RicambioMagazzino,
  tree: HierarchyTreeKey,
  listePrefs: MezziListePrefs,
): string[] {
  const refs = refsForTree(rowCompatRefs(row, listePrefs), tree);
  const labels: string[] = [];
  for (const ref of refs) {
    const label = resolveCompatRefLabel(ref, listePrefs);
    if (label) labels.push(label);
  }
  return labels;
}

function buildTreeCatalogFromProducts(
  prodotti: readonly RicambioMagazzino[],
  listePrefs: MezziListePrefs,
  tree: HierarchyTreeKey,
  seedMarche: Set<string>,
  modelliByMarca: Record<string, Set<string>>,
) {
  for (const marca of seedMarche) {
    if (!modelliByMarca[marca]) {
      modelliByMarca[marca] = new Set(
        tree === "attrezzature"
          ? modelliVisibiliPerMarca(listePrefs, marca)
          : modelliVisibiliPerMarcaHierarchy(listePrefs, tree, marca),
      );
    }
  }

  for (const p of prodotti) {
    for (const line of treeCompatLabels(p, tree, listePrefs)) {
      const { marca, modello } = parseCompatMarcaModello(line);
      if (marca) {
        seedMarche.add(marca);
        if (!modelliByMarca[marca]) modelliByMarca[marca] = new Set();
        if (modello) modelliByMarca[marca]!.add(modello);
      } else if (modello) {
        for (const m of seedMarche) {
          if (!modelliByMarca[m]) modelliByMarca[m] = new Set();
          modelliByMarca[m]!.add(modello);
        }
      }
    }
  }
}

export function buildMagazzinoFilterCatalog(
  prodotti: readonly RicambioMagazzino[],
  listePrefs: MezziListePrefs,
  masterCategorie: readonly string[],
  masterFornitori: readonly string[] = [],
): MagazzinoFilterCatalog {
  const compatMarcheSet = new Set<string>(marcheFromHierarchyTree(listePrefs, "attrezzature"));
  const compatModelliByMarca: Record<string, Set<string>> = {};
  const telaioMarcheSet = new Set<string>(marcheFromHierarchyTree(listePrefs, "telai"));
  const telaioModelliByMarca: Record<string, Set<string>> = {};

  buildTreeCatalogFromProducts(prodotti, listePrefs, "attrezzature", compatMarcheSet, compatModelliByMarca);
  buildTreeCatalogFromProducts(prodotti, listePrefs, "telai", telaioMarcheSet, telaioModelliByMarca);

  const categorie: string[] = [];
  for (const c of masterCategorie) pushUnique(categorie, c);
  for (const p of prodotti) pushUnique(categorie, dash(p.categoria));

  const fornitoriNonOriginali: string[] = [];
  for (const f of masterFornitori) pushUnique(fornitoriNonOriginali, f);
  for (const p of prodotti) pushUnique(fornitoriNonOriginali, dash(p.fornitoreNonOriginale));

  const sortIt = (a: string, b: string) => a.localeCompare(b, "it");
  const toSortedRecord = (marche: Set<string>, modelli: Record<string, Set<string>>) => {
    const out: Record<string, string[]> = {};
    for (const marca of [...marche].sort(sortIt)) {
      out[marca] = [...(modelli[marca] ?? [])].sort(sortIt);
    }
    return out;
  };

  return {
    compatMarche: [...compatMarcheSet].sort(sortIt),
    compatModelliByMarca: toSortedRecord(compatMarcheSet, compatModelliByMarca),
    telaioMarche: [...telaioMarcheSet].sort(sortIt),
    telaioModelliByMarca: toSortedRecord(telaioMarcheSet, telaioModelliByMarca),
    categorie: categorie.sort(sortIt),
    fornitoriNonOriginali: fornitoriNonOriginali.sort(sortIt),
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
  listePrefs?: MezziListePrefs,
): boolean {
  return magazzinoRowMatchesTreeCompatFilters(row, compatMarca, compatModello, "attrezzature", listePrefs);
}

export function magazzinoRowMatchesTreeCompatFilters(
  row: RicambioMagazzino,
  marcaSelRaw: string,
  modelloSelRaw: string,
  tree: HierarchyTreeKey,
  listePrefs?: MezziListePrefs,
): boolean {
  const marcaSel = marcaSelRaw.trim();
  const modelloSel = modelloSelRaw.trim();
  if (
    (!marcaSel || marcaSel === FILTER_ALL) &&
    (!modelloSel || modelloSel === FILTER_ALL)
  ) {
    return true;
  }

  if (!listePrefs) return false;

  const compatLines = treeCompatLabels(row, tree, listePrefs);
  if (compatLines.length === 0) {
    return isRicambioCompatUniversal(resolvedCompatLabels(row, listePrefs));
  }

  return compatLines.some((line) => {
    const { marca, modello } = parseCompatMarcaModello(line);
    if (isCompatMarcaUniversalLine(line)) {
      if (marcaSel && marcaSel !== FILTER_ALL && norm(marca) !== norm(marcaSel)) return false;
      return true;
    }
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
  listePrefs?: MezziListePrefs,
  tree: HierarchyTreeKey = "attrezzature",
): boolean {
  if (compatMarca === FILTER_ALL || compatModello === FILTER_ALL) {
    return magazzinoRowMatchesTreeCompatFilters(row, compatMarca, compatModello, tree, listePrefs);
  }
  if (!listePrefs) return false;
  const label = compatLabelMarcaModello(compatMarca, compatModello);
  const compatLines = treeCompatLabels(row, tree, listePrefs);
  if (compatLines.length === 0) {
    return isRicambioCompatUniversal(resolvedCompatLabels(row, listePrefs));
  }
  return compatLines.some((l) => {
    if (norm(l) === norm(label)) return true;
    if (isCompatMarcaUniversalLine(l)) {
      const { marca } = parseCompatMarcaModello(l);
      return norm(marca) === norm(compatMarca);
    }
    return false;
  });
}

export function magazzinoAdvancedFiltersActive(f: MagazzinoAdvancedFilters): boolean {
  return (
    (f.compatMarca.trim() !== "" && f.compatMarca !== FILTER_ALL) ||
    (f.compatModello.trim() !== "" && f.compatModello !== FILTER_ALL) ||
    (f.telaioMarca.trim() !== "" && f.telaioMarca !== FILTER_ALL) ||
    (f.telaioModello.trim() !== "" && f.telaioModello !== FILTER_ALL) ||
    (f.marcaRicambio.trim() !== "" && f.marcaRicambio !== FILTER_ALL) ||
    (f.categoria.trim() !== "" && f.categoria !== FILTER_ALL) ||
    (f.fornitoreNonOriginale.trim() !== "" && f.fornitoreNonOriginale !== FILTER_ALL)
  );
}

export function magazzinoRowMatchesAdvancedFilters(
  row: RicambioMagazzino,
  f: MagazzinoAdvancedFilters,
  listePrefs?: MezziListePrefs,
): boolean {
  if (!listFilterMatches(f.marcaRicambio, row.marca)) return false;
  if (!listFilterMatches(f.categoria, row.categoria)) return false;
  if (!listFilterMatches(f.fornitoreNonOriginale, row.fornitoreNonOriginale)) return false;
  if (
    f.compatMarca !== FILTER_ALL &&
    f.compatModello !== FILTER_ALL &&
    f.compatMarca.trim() &&
    f.compatModello.trim()
  ) {
    if (!magazzinoRowHasCompatLabel(row, f.compatMarca, f.compatModello, listePrefs, "attrezzature")) return false;
  } else if (!magazzinoRowMatchesCompatFilters(row, f.compatMarca, f.compatModello, listePrefs)) {
    return false;
  }
  if (
    f.telaioMarca !== FILTER_ALL &&
    f.telaioModello !== FILTER_ALL &&
    f.telaioMarca.trim() &&
    f.telaioModello.trim()
  ) {
    if (!magazzinoRowHasCompatLabel(row, f.telaioMarca, f.telaioModello, listePrefs, "telai")) return false;
  } else if (
    !magazzinoRowMatchesTreeCompatFilters(row, f.telaioMarca, f.telaioModello, "telai", listePrefs)
  ) {
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
