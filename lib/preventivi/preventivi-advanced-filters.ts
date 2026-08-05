import {
  preventivoClienteLabel,
  preventivoWorkflowLabel,
} from "@/lib/preventivi/preventivo-status-ui";
import type {
  PreventivoRecord,
  PreventivoStatoCliente,
  PreventivoStatoWorkflow,
  PreventivoTipoDocumento,
} from "@/lib/preventivi/types";
import { PREVENTIVO_TIPI_DOCUMENTO } from "@/lib/preventivi/preventivi-tipo-documento";
import { modelliVisibiliPerMarca } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { marcheFromHierarchyTree } from "@/lib/mezzi/hierarchy-list-prefs";

export const FILTER_ALL = "__tutti__" as const;

export type PreventiviAdvancedFilters = {
  cliente: string;
  cantiere: string;
  utilizzatore: string;
  marca: string;
  modello: string;
  stato: string;
  tipoDocumento: string;
  dataCreazioneDa: string;
  dataCreazioneA: string;
};

export const PREVENTIVI_ADVANCED_FILTERS_EMPTY: PreventiviAdvancedFilters = {
  cliente: "",
  cantiere: "",
  utilizzatore: "",
  marca: FILTER_ALL,
  modello: FILTER_ALL,
  stato: FILTER_ALL,
  tipoDocumento: FILTER_ALL,
  dataCreazioneDa: "",
  dataCreazioneA: "",
};

const GESTIONALE_STORAGE_KEY = "gestionale-preventivi-advanced-filters-v1";

export type PreventiviFilterCatalog = {
  clienti: string[];
  cantieri: string[];
  utilizzatori: string[];
  marche: string[];
  modelliByMarca: Record<string, string[]>;
};

export const PREVENTIVO_TIPI_DOCUMENTO_FILTER: readonly { id: PreventivoTipoDocumento; label: string }[] =
  PREVENTIVO_TIPI_DOCUMENTO;

export type PreventivoFilterStatoId = PreventivoStatoWorkflow | PreventivoStatoCliente;

const CLIENTE_FILTER_STATI = new Set<PreventivoStatoCliente>(["pending", "accettato", "rifiutato"]);

export const PREVENTIVO_STATI: readonly { id: PreventivoFilterStatoId; label: string }[] = [
  { id: "bozza", label: "Bozza" },
  { id: "inviato", label: "Inviato" },
  { id: "acquisito", label: "Acquisito" },
  { id: "annullato", label: "Annullato" },
  { id: "pending", label: "In attesa" },
  { id: "accettato", label: "Accettati" },
  { id: "rifiutato", label: "Rifiutati" },
] as const;

export function preventivoStatoLabel(stato: PreventivoFilterStatoId): string {
  if (CLIENTE_FILTER_STATI.has(stato as PreventivoStatoCliente)) {
    return preventivoClienteLabel(stato as PreventivoStatoCliente);
  }
  return preventivoWorkflowLabel(stato as PreventivoStatoWorkflow);
}

function preventivoRowMatchesStatoFilter(row: PreventivoRecord, stato: string): boolean {
  if (CLIENTE_FILTER_STATI.has(stato as PreventivoStatoCliente)) {
    return row.statoCliente === stato;
  }
  return row.statoWorkflow === stato;
}

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

export function buildPreventiviFilterCatalog(
  rows: readonly PreventivoRecord[],
  listePrefs: MezziListePrefs,
): PreventiviFilterCatalog {
  const clienti: string[] = [];
  const cantieri: string[] = [];
  const utilizzatori: string[] = [];
  const marcheSet = new Set<string>(marcheFromHierarchyTree(listePrefs, "attrezzature"));
  const modelliByMarca: Record<string, Set<string>> = {};

  for (const marca of marcheSet) {
    modelliByMarca[marca] = new Set(modelliVisibiliPerMarca(listePrefs, marca));
  }

  for (const r of rows) {
    pushUnique(clienti, dash(r.cliente));
    pushUnique(cantieri, dash(r.cantiere));
    pushUnique(utilizzatori, dash(r.utilizzatore));
    const marca = dash(r.marcaAttrezzatura);
    const modello = dash(r.modelloAttrezzatura);
    if (marca) {
      marcheSet.add(marca);
      if (!modelliByMarca[marca]) modelliByMarca[marca] = new Set();
      if (modello) modelliByMarca[marca]!.add(modello);
    }
  }

  for (const c of listePrefs.clienti) pushUnique(clienti, c);

  const sortIt = (a: string, b: string) => a.localeCompare(b, "it");
  const modelliRecord: Record<string, string[]> = {};
  for (const marca of [...marcheSet].sort(sortIt)) {
    modelliRecord[marca] = [...(modelliByMarca[marca] ?? [])].sort(sortIt);
  }

  return {
    clienti: clienti.sort(sortIt),
    cantieri: cantieri.sort(sortIt),
    utilizzatori: utilizzatori.sort(sortIt),
    marche: [...marcheSet].sort(sortIt),
    modelliByMarca: modelliRecord,
  };
}

function parseYmdLocal(ymd: string): Date | null {
  const t = ymd.trim();
  if (!t) return null;
  const [ys, ms, ds] = t.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const day = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) return null;
  const d = new Date(y, m - 1, day);
  if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== day) return null;
  return d;
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function listFilterMatches(selected: string, actual: string): boolean {
  const s = selected.trim();
  if (!s || s === FILTER_ALL) return true;
  return norm(actual) === norm(s);
}

export function preventiviRowDataCreazioneInRange(row: PreventivoRecord, daYmd: string, aYmd: string): boolean {
  const t = new Date(row.dataCreazione).getTime();
  if (!Number.isFinite(t)) return false;
  const rawDa = daYmd.trim();
  if (rawDa) {
    const p = parseYmdLocal(rawDa);
    if (p && t < startOfLocalDay(p).getTime()) return false;
  }
  const rawA = aYmd.trim();
  if (rawA) {
    const p = parseYmdLocal(rawA);
    if (p && t > endOfLocalDay(p).getTime()) return false;
  }
  return true;
}

export function preventiviAdvancedFiltersActive(f: PreventiviAdvancedFilters): boolean {
  return (
    f.cliente.trim() !== "" ||
    f.cantiere.trim() !== "" ||
    f.utilizzatore.trim() !== "" ||
    (f.marca.trim() !== "" && f.marca !== FILTER_ALL) ||
    (f.modello.trim() !== "" && f.modello !== FILTER_ALL) ||
    (f.stato.trim() !== "" && f.stato !== FILTER_ALL) ||
    (f.tipoDocumento.trim() !== "" && f.tipoDocumento !== FILTER_ALL) ||
    f.dataCreazioneDa.trim() !== "" ||
    f.dataCreazioneA.trim() !== ""
  );
}

export function preventiviRowMatchesAdvancedFilters(
  row: PreventivoRecord,
  f: PreventiviAdvancedFilters,
): boolean {
  if (f.cliente.trim() && norm(row.cliente) !== norm(f.cliente)) return false;
  if (f.cantiere.trim() && norm(row.cantiere) !== norm(f.cantiere)) return false;
  if (f.utilizzatore.trim() && norm(row.utilizzatore) !== norm(f.utilizzatore)) return false;
  if (!listFilterMatches(f.marca, row.marcaAttrezzatura)) return false;
  if (!listFilterMatches(f.modello, row.modelloAttrezzatura)) return false;
  if (f.stato !== FILTER_ALL && !preventivoRowMatchesStatoFilter(row, f.stato)) return false;
  if (f.tipoDocumento !== FILTER_ALL && row.tipoDocumento !== f.tipoDocumento) return false;
  if (!preventiviRowDataCreazioneInRange(row, f.dataCreazioneDa, f.dataCreazioneA)) return false;
  return true;
}

export function loadPreventiviAdvancedFiltersPersisted(): PreventiviAdvancedFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(GESTIONALE_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<PreventiviAdvancedFilters>;
    return { ...PREVENTIVI_ADVANCED_FILTERS_EMPTY, ...o };
  } catch {
    return null;
  }
}

export function savePreventiviAdvancedFiltersPersisted(f: PreventiviAdvancedFilters): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(GESTIONALE_STORAGE_KEY, JSON.stringify(f));
  } catch {
    /* ignore */
  }
}
