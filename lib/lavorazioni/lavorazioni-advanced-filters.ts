import { isoToDateInputValue } from "@/lib/lavorazioni/date-day-only";
import { lavRowIngressoInRange } from "@/lib/lavorazioni/lavorazioni-list-ui-filters";
import type { LavorazioneSchedeStore } from "@/types/schede";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MezzoGestito } from "@/lib/mezzi/types";

export const FILTER_ALL = "__tutti__" as const;

export type LavorazioniSectionFilter = "" | "in_corso" | "archivio";

/** Filtri avanzati condivisi (toolbar pannello). La ricerca libera resta separata. */
export type LavorazioniAdvancedFilters = {
  cliente: string;
  cantiere: string;
  utilizzatore: string;
  addetto: string;
  marca: string;
  modello: string;
  stato: string;
  ingressoDa: string;
  ingressoA: string;
  completamentoDa: string;
  completamentoA: string;
  /** Solo portale clienti: restringe in corso / archivio. */
  section: LavorazioniSectionFilter;
};

export const LAVORAZIONI_ADVANCED_FILTERS_EMPTY: LavorazioniAdvancedFilters = {
  cliente: "",
  cantiere: "",
  utilizzatore: "",
  addetto: FILTER_ALL,
  marca: FILTER_ALL,
  modello: FILTER_ALL,
  stato: FILTER_ALL,
  ingressoDa: "",
  ingressoA: "",
  completamentoDa: "",
  completamentoA: "",
  section: "",
};

const GESTIONALE_STORAGE_KEY = "gestionale-lavorazioni-advanced-filters-v1";

export type LavorazioniFilterCatalog = {
  clienti: string[];
  cantieri: string[];
  utilizzatori: string[];
  addetti: string[];
  marche: string[];
  modelliByMarca: Record<string, string[]>;
};

export type RowEntityFields = {
  cliente: string;
  cantiere: string;
  utilizzatore: string;
  addetto: string;
  marca: string;
  modello: string;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function dash(v: string | null | undefined): string {
  const t = v?.trim();
  return t && t !== "—" ? t : "";
}

function rowEntityFields(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore | undefined,
  defaultAddetto: string,
): RowEntityFields {
  const ing = schedeStore?.[row.id]?.ingresso?.campi;
  const m = row.mezzo;
  const addetto =
    ing?.addettoAccettazione?.trim() ||
    schedeStore?.[row.id]?.lavorazioni?.campi.righe
      .flatMap((r) => r.addettiAssegnati)
      .find((a) => a.addetto.trim())
      ?.addetto.trim() ||
    defaultAddetto ||
    "";

  let marca = "";
  let modello = "";
  if (ing?.marcaAttrezzatura?.trim()) {
    marca = ing.marcaAttrezzatura.trim();
    modello = ing.modelloAttrezzatura?.trim() || "";
  } else if (m) {
    marca = m.marca?.trim() || "";
    modello = m.modello?.trim() || "";
  }

  return {
    cliente: dash(ing?.cliente?.trim() || m?.cliente),
    cantiere: dash(ing?.cantiere?.trim()),
    utilizzatore: dash(ing?.utilizzatore?.trim() || m?.utilizzatore),
    addetto: dash(addetto),
    marca,
    modello,
  };
}

function pushUnique(sorted: string[], value: string) {
  const v = value.trim();
  if (!v || v === "—") return;
  if (!sorted.includes(v)) sorted.push(v);
}

export function buildLavorazioniFilterCatalog(
  rows: readonly LavorazioneListRow[],
  schedeStore: LavorazioneSchedeStore | undefined,
  addettiGlobali: readonly string[],
  mezziCatalog: readonly MezzoGestito[],
  defaultAddetto: string,
): LavorazioniFilterCatalog {
  const clienti: string[] = [];
  const cantieri: string[] = [];
  const utilizzatori: string[] = [];
  const addettiSet = new Set<string>(addettiGlobali.filter((a) => a.trim()));
  const marcheSet = new Set<string>();
  const modelliByMarca: Record<string, Set<string>> = {};

  for (const m of mezziCatalog) {
    const marca = m.marca?.trim();
    const modello = m.modello?.trim();
    if (marca) {
      marcheSet.add(marca);
      if (!modelliByMarca[marca]) modelliByMarca[marca] = new Set();
      if (modello) modelliByMarca[marca]!.add(modello);
    }
  }

  for (const row of rows) {
    const f = rowEntityFields(row, schedeStore, defaultAddetto);
    pushUnique(clienti, f.cliente);
    pushUnique(cantieri, f.cantiere);
    pushUnique(utilizzatori, f.utilizzatore);
    if (f.addetto) addettiSet.add(f.addetto);
    if (f.marca) {
      marcheSet.add(f.marca);
      if (!modelliByMarca[f.marca]) modelliByMarca[f.marca] = new Set();
      if (f.modello) modelliByMarca[f.marca]!.add(f.modello);
    }
  }

  const sortIt = (a: string, b: string) => a.localeCompare(b, "it");
  const modelliRecord: Record<string, string[]> = {};
  for (const marca of [...marcheSet].sort(sortIt)) {
    modelliRecord[marca] = [...(modelliByMarca[marca] ?? [])].sort(sortIt);
  }

  return {
    clienti: clienti.sort(sortIt),
    cantieri: cantieri.sort(sortIt),
    utilizzatori: utilizzatori.sort(sortIt),
    addetti: [...addettiSet].sort(sortIt),
    marche: [...marcheSet].sort(sortIt),
    modelliByMarca: modelliRecord,
  };
}

function dayStartMs(ymd: string): number {
  const t = ymd.trim();
  if (!t) return NaN;
  const d = new Date(t.length <= 10 ? `${t}T00:00:00` : t);
  return d.getTime();
}

function dayEndMs(ymd: string): number {
  const t = ymd.trim();
  if (!t) return NaN;
  const d = new Date(t.length <= 10 ? `${t}T23:59:59.999` : t);
  return d.getTime();
}

export function lavRowCompletamentoInRange(row: LavorazioneListRow, daYmd: string, aYmd: string): boolean {
  if (!daYmd.trim() && !aYmd.trim()) return true;
  const raw = row.archived_at?.trim() || row.data_uscita?.trim();
  if (!raw) return false;
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return false;
  if (daYmd.trim()) {
    const d0 = dayStartMs(daYmd);
    if (Number.isFinite(d0) && t < d0) return false;
  }
  if (aYmd.trim()) {
    const d1 = dayEndMs(aYmd);
    if (Number.isFinite(d1) && t > d1) return false;
  }
  return true;
}

export type LavorazioniListFilterVariant = "in_corso" | "archivio";

function listFilterMatches(selected: string, actual: string): boolean {
  const s = selected.trim();
  if (!s || s === FILTER_ALL) return true;
  return norm(actual) === norm(s);
}

export function lavorazioniAdvancedFiltersActive(f: LavorazioniAdvancedFilters): boolean {
  return (
    f.cliente.trim() !== "" ||
    f.cantiere.trim() !== "" ||
    f.utilizzatore.trim() !== "" ||
    (f.addetto.trim() !== "" && f.addetto !== FILTER_ALL) ||
    (f.marca.trim() !== "" && f.marca !== FILTER_ALL) ||
    (f.modello.trim() !== "" && f.modello !== FILTER_ALL) ||
    (f.stato.trim() !== "" && f.stato !== FILTER_ALL) ||
    f.ingressoDa.trim() !== "" ||
    f.ingressoA.trim() !== "" ||
    f.completamentoDa.trim() !== "" ||
    f.completamentoA.trim() !== "" ||
    f.section !== ""
  );
}

export function lavRowMatchesAdvancedFilters(
  row: LavorazioneListRow,
  f: LavorazioniAdvancedFilters,
  schedeStore: LavorazioneSchedeStore | undefined,
  defaultAddetto: string,
  variant?: LavorazioniListFilterVariant,
): boolean {
  const entity = rowEntityFields(row, schedeStore, defaultAddetto);

  if (f.cliente.trim() && norm(entity.cliente) !== norm(f.cliente)) return false;
  if (f.cantiere.trim() && norm(entity.cantiere) !== norm(f.cantiere)) return false;
  if (f.utilizzatore.trim() && norm(entity.utilizzatore) !== norm(f.utilizzatore)) return false;

  if (!listFilterMatches(f.addetto, entity.addetto)) return false;
  if (!listFilterMatches(f.marca, entity.marca)) return false;
  if (!listFilterMatches(f.modello, entity.modello)) return false;
  if (f.stato !== FILTER_ALL && row.stato !== f.stato) return false;

  if (!lavRowIngressoInRange(row, f.ingressoDa, f.ingressoA)) return false;
  if (variant !== "in_corso" && !lavRowCompletamentoInRange(row, f.completamentoDa, f.completamentoA)) return false;

  return true;
}

export function loadGestionaleAdvancedFiltersPersisted(): LavorazioniAdvancedFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(GESTIONALE_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<LavorazioniAdvancedFilters>;
    return { ...LAVORAZIONI_ADVANCED_FILTERS_EMPTY, ...o, section: "" };
  } catch {
    return null;
  }
}

export function saveGestionaleAdvancedFiltersPersisted(f: LavorazioniAdvancedFilters): void {
  if (typeof window === "undefined") return;
  try {
    const { section: _s, ...rest } = f;
    window.sessionStorage.setItem(GESTIONALE_STORAGE_KEY, JSON.stringify(rest));
  } catch {
    /* ignore */
  }
}

/** Converte ISO salvato in yyyy-mm-dd per range (accetta anche già ymd). */
export function filterDateToYmd(isoOrYmd: string): string {
  const s = isoOrYmd.trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return isoToDateInputValue(s);
}
