import { labelLavorazioneStatoDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import type {
  DocumentoRow,
  LogModificaRow,
  LavorazioneRow,
  MovimentoRicambioRow,
  PreventivoRow,
  SchedaLavorazioneRow,
} from "@/src/types/supabase-tables";

export type LavorazioneQueriesSnapshot = {
  lavorazioneRow: LavorazioneRow | null | undefined;
  schedeRows: SchedaLavorazioneRow[];
  movimentiRows: MovimentoRicambioRow[];
  preventiviRows: PreventivoRow[];
  documentiRows: DocumentoRow[];
  logRows: LogModificaRow[];
};

export type LavorazioneHubKpi = {
  stato: string;
  statoLabel: string;
  priorita: string;
  giorniApertura: number | null;
  countSchede: number;
  countMovimenti: number;
  movimentiEntrataCount: number;
  movimentiUscitaCount: number;
  qtyRicambiUscita: number;
  countPreventivi: number;
  countDocumenti: number;
  countLog: number;
};

export type LavorazioneTimelineKind = "lavorazione" | "scheda" | "movimento" | "preventivo" | "documento" | "log";

export type LavorazioneTimelineItem = {
  id: string;
  kind: LavorazioneTimelineKind;
  at: string;
  title: string;
  subtitle?: string;
};

export type LavorazioneHubData = {
  lavorazioneId: string;
  lavorazione: LavorazioneRow;
  schede: SchedaLavorazioneRow[];
  movimenti: MovimentoRicambioRow[];
  preventivi: PreventivoRow[];
  documenti: DocumentoRow[];
  log: LogModificaRow[];
  kpi: LavorazioneHubKpi;
};

type LavorazioneHubCore = {
  lavorazione: LavorazioneRow;
  schedeRows: SchedaLavorazioneRow[];
  movimentiRows: MovimentoRicambioRow[];
  preventiviRows: PreventivoRow[];
  documentiRows: DocumentoRow[];
  logRows: LogModificaRow[];
};

function parseDayStart(iso: string): Date | null {
  const s = iso.trim();
  if (!s) return null;
  const d = new Date(s.length <= 10 ? `${s}T12:00:00` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function utcTodayStart(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 12, 0, 0, 0));
}

/** Giorni tra ingresso e uscita (o oggi se ancora aperta). */
function giorniAperturaLavorazione(row: LavorazioneRow): number | null {
  const start = parseDayStart(row.data_ingresso ?? "");
  if (!start) return null;
  const endRaw = row.data_uscita?.trim();
  const end = endRaw ? parseDayStart(endRaw) : utcTodayStart();
  if (!end) return null;
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diff / (86_400_000)));
}

function toCore(snapshot: LavorazioneQueriesSnapshot): LavorazioneHubCore | null {
  const row = snapshot.lavorazioneRow;
  if (!row) return null;
  return {
    lavorazione: row,
    schedeRows: snapshot.schedeRows,
    movimentiRows: snapshot.movimentiRows,
    preventiviRows: snapshot.preventiviRows,
    documentiRows: snapshot.documentiRows,
    logRows: snapshot.logRows,
  };
}

function deriveKpi(core: LavorazioneHubCore): LavorazioneHubKpi {
  const mov = core.movimentiRows;
  const ent = mov.filter((m) => m.tipo === "entrata");
  const usc = mov.filter((m) => m.tipo === "uscita");
  const qtyUsc = usc.reduce((acc, m) => acc + (Number.isFinite(m.quantita) ? m.quantita : 0), 0);
  return {
    stato: core.lavorazione.stato,
    statoLabel: labelLavorazioneStatoDb(core.lavorazione.stato),
    priorita: core.lavorazione.priorita,
    giorniApertura: giorniAperturaLavorazione(core.lavorazione),
    countSchede: core.schedeRows.length,
    countMovimenti: mov.length,
    movimentiEntrataCount: ent.length,
    movimentiUscitaCount: usc.length,
    qtyRicambiUscita: qtyUsc,
    countPreventivi: core.preventiviRows.length,
    countDocumenti: core.documentiRows.length,
    countLog: core.logRows.length,
  };
}

function assembleHub(core: LavorazioneHubCore): LavorazioneHubData {
  return {
    lavorazioneId: core.lavorazione.id,
    lavorazione: core.lavorazione,
    schede: core.schedeRows,
    movimenti: core.movimentiRows,
    preventivi: core.preventiviRows,
    documenti: core.documentiRows,
    log: core.logRows,
    kpi: deriveKpi(core),
  };
}

/** Solo composizione dati già risolti dalla cache (nessun IO). */
export const lavorazioniDomainService = {
  composeLavorazioneHub(snapshot: LavorazioneQueriesSnapshot): LavorazioneHubData | null {
    const core = toCore(snapshot);
    if (!core) return null;
    return assembleHub(core);
  },

  composeKpi(snapshot: LavorazioneQueriesSnapshot): LavorazioneHubKpi | null {
    const core = toCore(snapshot);
    if (!core) return null;
    return deriveKpi(core);
  },

};
