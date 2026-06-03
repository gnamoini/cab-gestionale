import { capitaleImmobilizzato } from "@/lib/magazzino/calculations";
import { lavorazioneAddettoLabel } from "@/lib/lavorazioni/lavorazione-display-helpers";
import { comparePrioritaLavorazione } from "@/lib/lavorazioni/priorita-order";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { isoInRange, todayUntilNowRange, type DateRange } from "@/lib/report/date-ranges";
import type { MovimentoRicambioRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

export type DashboardLavWidgetRow = {
  id: string;
  stato: string;
  priorita: string;
  macchina: string;
  /** Cliente · matricola · n. scuderia · targa (solo valori presenti). */
  mezzoIdent: string | null;
  /** Addetto assegnato (da schede), se presente. */
  addetto: string | null;
  updatedAt: string;
  isUrgent: boolean;
};

export type DashboardLavWidgetRowsOptions = {
  schedeStore?: LavorazioneSchedeStore;
  defaultAddetto?: string;
};

export type DashboardMagRecentRicambioRow = {
  id: string;
  label: string;
  marca: string;
  codice: string;
  updatedAt: string;
  sottoScorta: boolean;
};

export type DashboardMagMovementRow = {
  id: string;
  tipo: MovimentoRicambioRow["tipo"];
  quantita: number;
  at: string;
  label: string;
};

export type DashboardMagDailyMovements = {
  entrate: number;
  uscite: number;
};

export type DashboardLavWidgetStats = {
  inCorso: number;
  urgenti: number;
  entratiOggi: number;
};

export type DashboardMagWidgetStats = {
  capitale: number;
  sottoScorta: number;
};

function isSameLocalCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isTodayLocal(iso: string): boolean {
  return isSameLocalCalendarDay(new Date(iso), new Date());
}

function macchinaLabelFromLavRow(row: LavorazioneListRow): string {
  const m = row.mezzo;
  return m ? `${m.marca} ${m.modello}`.trim() : "—";
}

function mezzoIdentPartsFromLavRow(row: LavorazioneListRow): {
  cliente: string;
  matricola: string;
  nScuderia: string;
  targa: string;
} {
  const m = row.mezzo;
  return {
    cliente: m?.cliente?.trim() ?? "",
    matricola: m?.matricola?.trim() ?? "",
    nScuderia: m?.numero_scuderia?.trim() ?? "",
    targa: m?.targa?.trim() ?? "",
  };
}

function lavUpdatedAt(row: LavorazioneListRow): string {
  return row.updated_at ?? row.created_at;
}

function lavIngressIso(row: LavorazioneListRow): string {
  return row.data_ingresso ?? row.created_at;
}

function toLavWidgetRow(
  row: LavorazioneListRow,
  options?: DashboardLavWidgetRowsOptions,
): DashboardLavWidgetRow {
  const addettoRaw = lavorazioneAddettoLabel(row, options?.schedeStore, options?.defaultAddetto ?? "");
  return {
    id: row.id,
    stato: row.stato,
    priorita: row.priorita,
    macchina: macchinaLabelFromLavRow(row),
    mezzoIdent: formatDashboardLavWidgetMezzoIdent(mezzoIdentPartsFromLavRow(row)),
    addetto: addettoRaw || null,
    updatedAt: lavUpdatedAt(row),
    isUrgent: row.priorita === "urgente",
  };
}

/** Contatori KPI widget Lavorazioni (stesso dataset lista attiva non archiviata). */
export function computeDashboardLavWidgetStats(rows: readonly LavorazioneListRow[]): DashboardLavWidgetStats {
  let urgenti = 0;
  let entratiOggi = 0;
  for (const row of rows) {
    if (row.priorita === "urgente") urgenti++;
    if (isTodayLocal(lavIngressIso(row))) entratiOggi++;
  }
  return { inCorso: rows.length, urgenti, entratiOggi };
}

/** Priorità decrescente (urgente → bassa), poi data aggiornamento (max N). */
export function computeDashboardLavWidgetRows(
  rows: readonly LavorazioneListRow[],
  limit = 4,
  options?: DashboardLavWidgetRowsOptions,
): DashboardLavWidgetRow[] {
  return [...rows]
    .sort((a, b) => {
      const byPriority = comparePrioritaLavorazione(b.priorita, a.priorita);
      if (byPriority !== 0) return byPriority;
      return lavUpdatedAt(b).localeCompare(lavUpdatedAt(a));
    })
    .slice(0, limit)
    .map((row) => toLavWidgetRow(row, options));
}

export function computeDashboardMagWidgetStats(items: readonly RicambioMagazzino[]): DashboardMagWidgetStats {
  const sottoScorta = items.filter((p) => p.scortaMinima > 0 && p.scorta < p.scortaMinima).length;
  const capitale = items.reduce((acc, r) => acc + capitaleImmobilizzato(r), 0);
  return { sottoScorta, capitale };
}

function isRicambioSottoScorta(r: RicambioMagazzino): boolean {
  return r.scortaMinima > 0 && r.scorta < r.scortaMinima;
}

function toDashboardMagRicambioRow(r: RicambioMagazzino): DashboardMagRecentRicambioRow {
  return {
    id: r.id,
    label: r.descrizione.trim() || r.codiceFornitoreOriginale,
    marca: r.marca.trim() || "—",
    codice: r.codiceFornitoreOriginale,
    updatedAt: r.dataUltimaModifica,
    sottoScorta: isRicambioSottoScorta(r),
  };
}

/** Ricambi sotto scorta (per primi nel widget dashboard). */
export function computeDashboardMagSottoScortaRicambi(
  items: readonly RicambioMagazzino[],
  limit = 5,
): DashboardMagRecentRicambioRow[] {
  return [...items]
    .filter(isRicambioSottoScorta)
    .sort((a, b) => b.dataUltimaModifica.localeCompare(a.dataUltimaModifica))
    .slice(0, limit)
    .map(toDashboardMagRicambioRow);
}

/** Ultimi modificati, esclusi quelli già in sezione sotto scorta. */
export function computeDashboardMagRecentRicambi(
  items: readonly RicambioMagazzino[],
  limit = 5,
): DashboardMagRecentRicambioRow[] {
  return [...items]
    .filter((r) => !isRicambioSottoScorta(r))
    .sort((a, b) => b.dataUltimaModifica.localeCompare(a.dataUltimaModifica))
    .slice(0, limit)
    .map(toDashboardMagRicambioRow);
}

export function computeDashboardMagDailyMovements(
  rows: readonly MovimentoRicambioRow[],
  range: DateRange = todayUntilNowRange(),
): DashboardMagDailyMovements {
  let entrate = 0;
  let uscite = 0;
  for (const m of rows) {
    if (!isoInRange(m.created_at, range)) continue;
    const q = Math.max(1, Math.round(Number(m.quantita) || 0));
    if (m.tipo === "entrata") entrate += q;
    else uscite += q;
  }
  return { entrate, uscite };
}

export function computeDashboardMagRecentMovements(
  movements: readonly MovimentoRicambioRow[],
  ricambiById: ReadonlyMap<string, RicambioMagazzino>,
  limit = 5,
): DashboardMagMovementRow[] {
  return [...movements]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
    .map((m) => {
      const ric = ricambiById.get(m.ricambio_id);
      const label = ric?.descrizione?.trim() || ric?.codiceFornitoreOriginale || "—";
      return {
        id: m.id,
        tipo: m.tipo,
        quantita: m.quantita,
        at: m.created_at,
        label,
      };
    });
}

function dashboardIdentSegment(value: string | undefined): string {
  const t = value?.trim() ?? "";
  return t && t !== "—" ? t : "";
}

/** Cliente · matricola · n. scuderia · targa — omette campi assenti (niente «—» o segnaposto). */
export function formatDashboardLavWidgetMezzoIdent(parts: {
  cliente?: string;
  matricola?: string;
  nScuderia?: string;
  targa?: string;
}): string | null {
  const segments = [
    dashboardIdentSegment(parts.cliente),
    dashboardIdentSegment(parts.matricola),
    dashboardIdentSegment(parts.nScuderia),
    dashboardIdentSegment(parts.targa),
  ].filter(Boolean);
  return segments.length > 0 ? segments.join(" · ") : null;
}

export function formatDashboardMagRicambioIdent(marca: string, codice: string): string | null {
  const m = marca.trim();
  const c = codice.trim();
  const hasMarca = m.length > 0 && m !== "—";
  const hasCodice = c.length > 0 && c !== "—";
  if (hasMarca && hasCodice) return `${m} · ${c}`;
  if (hasMarca) return m;
  if (hasCodice) return c;
  return null;
}

/** Titolo riga widget magazzino: marca + nome ricambio (senza codice). */
export function formatDashboardMagRicambioTitle(marca: string, nome: string): string {
  const m = marca.trim();
  const n = nome.trim();
  const hasMarca = m.length > 0 && m !== "—";
  if (hasMarca && n) return `${m} ${n}`;
  if (n) return n;
  if (hasMarca) return m;
  return "—";
}
