import type { CatalogMarca } from "@/lib/documenti/documenti-catalog-types";
import { resolveDocumentoApplicazione } from "@/lib/documenti/documenti-applicabilita";
import { documentoSenzaMarca } from "@/components/gestionale/documenti/documenti-helpers";
import type { DocumentoGestionale } from "@/lib/types/gestionale";

export const FILTER_ALL = "__tutti__" as const;

export type DocumentiAdvancedFilters = {
  /** Id marca catalogo o FILTER_ALL. */
  marca: string;
  /** Id modello catalogo o FILTER_ALL. */
  modello: string;
  categoria: DocumentoGestionale["categoria"] | typeof FILTER_ALL;
};

export const DOCUMENTI_ADVANCED_FILTERS_EMPTY: DocumentiAdvancedFilters = {
  marca: FILTER_ALL,
  modello: FILTER_ALL,
  categoria: FILTER_ALL,
};

const GESTIONALE_STORAGE_KEY = "gestionale-documenti-advanced-filters-v1";

function sameMarca(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function sameModello(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function documentiAdvancedFiltersActive(f: DocumentiAdvancedFilters): boolean {
  return (
    (f.marca.trim() !== "" && f.marca !== FILTER_ALL) ||
    (f.modello.trim() !== "" && f.modello !== FILTER_ALL) ||
    (f.categoria.trim() !== "" && f.categoria !== FILTER_ALL)
  );
}

/** Filtri panel (marca, modello, categoria) — senza ricerca testuale. */
export function documentoRowMatchesAdvancedFilters(
  doc: DocumentoGestionale,
  f: DocumentiAdvancedFilters,
  catalog: CatalogMarca[],
): boolean {
  const r = resolveDocumentoApplicazione(doc);

  if (f.categoria !== FILTER_ALL && doc.categoria !== f.categoria) return false;

  if (documentoSenzaMarca(doc)) return true;

  if (f.marca !== FILTER_ALL) {
    const mar = catalog.find((m) => m.id === f.marca);
    if (!mar || !sameMarca(r.marcaKey ?? r.marca, mar.nome)) return false;
  }
  if (f.modello !== FILTER_ALL) {
    const mar = f.marca !== FILTER_ALL ? catalog.find((m) => m.id === f.marca) : null;
    const modelliScope = mar?.macchine ?? catalog.flatMap((m) => m.macchine);
    const mac = modelliScope.find((x) => x.id === f.modello);
    if (!mac) return false;
    if (r.applicabilita === "marca") return true;
    if (!sameModello(r.modelloKey ?? r.macchina, mac.nome)) return false;
  }
  return true;
}

export function loadDocumentiAdvancedFiltersPersisted(): DocumentiAdvancedFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(GESTIONALE_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<DocumentiAdvancedFilters>;
    return { ...DOCUMENTI_ADVANCED_FILTERS_EMPTY, ...o };
  } catch {
    return null;
  }
}

export function saveDocumentiAdvancedFiltersPersisted(f: DocumentiAdvancedFilters): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(GESTIONALE_STORAGE_KEY, JSON.stringify(f));
  } catch {
    /* ignore */
  }
}
