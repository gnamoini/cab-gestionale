import { capitaleImmobilizzato } from "@/lib/magazzino/calculations";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MovimentoRicambioRow } from "@/src/types/supabase-tables";

export type DashboardLavWidgetRow = {
  id: string;
  stato: string;
  priorita: string;
  macchina: string;
  cliente: string;
  ident: string;
  updatedAt: string;
  isUrgent: boolean;
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

function clienteLabelFromLavRow(row: LavorazioneListRow): string {
  return row.mezzo?.cliente?.trim() || "—";
}

/** Targa se presente, altrimenti matricola. */
function targaOrMatricolaFromLavRow(row: LavorazioneListRow): string {
  const m = row.mezzo;
  if (!m) return "—";
  const targa = m.targa?.trim();
  if (targa) return targa;
  const matricola = m.matricola?.trim();
  if (matricola) return matricola;
  return "—";
}

function lavUpdatedAt(row: LavorazioneListRow): string {
  return row.updated_at ?? row.created_at;
}

function toLavWidgetRow(row: LavorazioneListRow): DashboardLavWidgetRow {
  return {
    id: row.id,
    stato: row.stato,
    priorita: row.priorita,
    macchina: macchinaLabelFromLavRow(row),
    cliente: clienteLabelFromLavRow(row),
    ident: targaOrMatricolaFromLavRow(row),
    updatedAt: lavUpdatedAt(row),
    isUrgent: row.priorita === "urgente",
  };
}

/** Ultime modificate + urgenti (dedupe, max N). */
export function computeDashboardLavWidgetRows(
  rows: readonly LavorazioneListRow[],
  limit = 5,
): DashboardLavWidgetRow[] {
  const byUpdated = [...rows].sort((a, b) => lavUpdatedAt(b).localeCompare(lavUpdatedAt(a)));
  const urgent = byUpdated.filter((r) => r.priorita === "urgente");
  const seen = new Set<string>();
  const out: DashboardLavWidgetRow[] = [];

  for (const row of urgent) {
    if (out.length >= limit) break;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(toLavWidgetRow(row));
  }
  for (const row of byUpdated) {
    if (out.length >= limit) break;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(toLavWidgetRow(row));
  }
  return out;
}

export function computeDashboardMagWidgetStats(items: readonly RicambioMagazzino[]): DashboardMagWidgetStats {
  const sottoScorta = items.filter((p) => p.scortaMinima > 0 && p.scorta < p.scortaMinima).length;
  const capitale = items.reduce((acc, r) => acc + capitaleImmobilizzato(r), 0);
  return { sottoScorta, capitale };
}

/** Ricambi ordinati per `dataUltimaModifica` (anagrafica aggiornata, non movimenti stock). */
export function computeDashboardMagRecentRicambi(
  items: readonly RicambioMagazzino[],
  limit = 5,
): DashboardMagRecentRicambioRow[] {
  return [...items]
    .sort((a, b) => b.dataUltimaModifica.localeCompare(a.dataUltimaModifica))
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      label: r.descrizione.trim() || r.codiceFornitoreOriginale,
      marca: r.marca.trim() || "—",
      codice: r.codiceFornitoreOriginale,
      updatedAt: r.dataUltimaModifica,
      sottoScorta: r.scortaMinima > 0 && r.scorta < r.scortaMinima,
    }));
}

export function computeDashboardMagDailyMovements(
  rows: readonly MovimentoRicambioRow[],
): DashboardMagDailyMovements {
  let entrate = 0;
  let uscite = 0;
  for (const m of rows) {
    if (!isTodayLocal(m.created_at)) continue;
    if (m.tipo === "entrata") entrate += 1;
    else uscite += 1;
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

export function formatDashboardLavWidgetSubtitle(cliente: string, ident: string): string | null {
  const c = cliente.trim();
  const i = ident.trim();
  const hasCliente = c.length > 0 && c !== "—";
  const hasIdent = i.length > 0 && i !== "—";
  if (hasCliente && hasIdent) return `${c} · ${i}`;
  if (hasCliente) return c;
  if (hasIdent) return i;
  return null;
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
