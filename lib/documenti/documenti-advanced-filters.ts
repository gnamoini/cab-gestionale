import { resolveDocumentoApplicazione } from "@/lib/documenti/documenti-applicabilita";
import { documentoSenzaMarca } from "@/components/gestionale/documenti/documenti-helpers";
import type { DocumentoGestionale } from "@/lib/types/gestionale";

export const FILTER_ALL = "__tutti__" as const;

export type DocumentiAdvancedFilters = {
  /** Nome marca (impostazioni globali) o FILTER_ALL. */
  marca: string;
  /** Nome modello (impostazioni globali) o FILTER_ALL. */
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

/** Migra filtri persistiti che usavano id catalogo (`marca-*`, `mdl-*`). */
function migratePersistedMarcaModello(
  raw: Partial<DocumentiAdvancedFilters>,
): Pick<DocumentiAdvancedFilters, "marca" | "modello"> {
  const marca = raw.marca?.trim() ?? FILTER_ALL;
  const modello = raw.modello?.trim() ?? FILTER_ALL;
  const marcaNome =
    marca !== FILTER_ALL && marca.startsWith("marca-") ? FILTER_ALL : marca;
  const modelloNome =
    modello !== FILTER_ALL && modello.startsWith("mdl-") ? FILTER_ALL : modello;
  return { marca: marcaNome || FILTER_ALL, modello: modelloNome || FILTER_ALL };
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
): boolean {
  const r = resolveDocumentoApplicazione(doc);

  if (f.categoria !== FILTER_ALL && doc.categoria !== f.categoria) return false;

  if (documentoSenzaMarca(doc)) return true;

  if (f.marca !== FILTER_ALL && !sameMarca(r.marcaKey ?? r.marca, f.marca)) return false;

  if (f.modello !== FILTER_ALL) {
    if (r.applicabilita === "marca") return true;
    if (!sameModello(r.modelloKey ?? r.macchina, f.modello)) return false;
  }
  return true;
}

export function loadDocumentiAdvancedFiltersPersisted(): DocumentiAdvancedFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(GESTIONALE_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<DocumentiAdvancedFilters>;
    const migrated = migratePersistedMarcaModello(o);
    return { ...DOCUMENTI_ADVANCED_FILTERS_EMPTY, ...o, ...migrated };
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
