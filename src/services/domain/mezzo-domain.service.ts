import {
  documentoRowToGestionale,
  logModificaRowToMezziHubLogEntry,
  preventivoRowToRecordStub,
  type MezziHubLogEntry,
} from "@/lib/mezzi/mezzi-db-ui-adapter";
import { mezzoGestitoToEmbedRow } from "@/lib/mezzi/mezzi-attrezzature-batch";
import {
  interventiMezzoDaLavorazioniDb,
  labelLavorazioneStatoDb,
  mezzoHaLavorazioneAttivaDb,
} from "@/lib/mezzi/interventi-from-lavorazioni-db";
import { logAutoreLabel } from "@/lib/gestionale-log/log-modifiche-view-model";
import { interventoTargetBadge } from "@/lib/domain/mezzo-attrezzatura/intervento-target";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MezzoInterventoLavorazione } from "@/lib/mezzi/types";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { DocumentoGestionale } from "@/lib/types/gestionale";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { DocumentoRow, LogModificaRow, MezzoRow, MovimentoRicambioRow, PreventivoRow, AssetTimelineProjectionRow } from "@/src/types/supabase-tables";

export type MezzoHubKpi = {
  totaleLavorazioni: number;
  lavorazioneAttiva: boolean;
  documentiCount: number;
  preventiviCount: number;
};

export type MezzoTimelineKind = "lavorazione" | "log" | "movimento" | "lifecycle";

export type MezzoTimelineItem = {
  id: string;
  kind: MezzoTimelineKind;
  at: string;
  title: string;
  subtitle?: string;
  targetBadge?: string;
  ref?: { lavorazioneId?: string; origine?: "attiva" | "storico" };
};

export type MezzoHubData = {
  mezzoId: string;
  mezzoRow: MezzoRow;
  lavorazioni: LavorazioneListRow[];
  interventi: MezzoInterventoLavorazione[];
  preventivi: PreventivoRecord[];
  documenti: DocumentoGestionale[];
  log: MezziHubLogEntry[];
  movimenti: MovimentoRicambioRow[];
  kpi: MezzoHubKpi;
  timeline: MezzoTimelineItem[];
};

/** Snapshot read-only da sole query React Query (nessun IO). */
export type MezzoQueriesSnapshot = {
  mezzoGestito: MezzoGestito | null | undefined;
  lavorazioni: LavorazioneListRow[];
  preventiviRows: PreventivoRow[];
  documentiRows: DocumentoRow[];
  logRows: LogModificaRow[];
  movimentiRows: MovimentoRicambioRow[];
  lifecycleRows?: AssetTimelineProjectionRow[];
};

type MezzoHubCore = {
  mezzoGestito: MezzoGestito;
  lavorazioni: LavorazioneListRow[];
  preventiviRows: PreventivoRow[];
  documentiRows: DocumentoRow[];
  logRows: LogModificaRow[];
  movimentiRows: MovimentoRicambioRow[];
  lifecycleRows?: AssetTimelineProjectionRow[];
};

function toCore(snapshot: MezzoQueriesSnapshot): MezzoHubCore | null {
  if (!snapshot.mezzoGestito) return null;
  return {
    mezzoGestito: snapshot.mezzoGestito,
    lavorazioni: snapshot.lavorazioni,
    preventiviRows: snapshot.preventiviRows,
    documentiRows: snapshot.documentiRows,
    logRows: snapshot.logRows,
    movimentiRows: snapshot.movimentiRows,
    lifecycleRows: snapshot.lifecycleRows,
  };
}

function deriveKpi(core: MezzoHubCore): MezzoHubKpi {
  return {
    totaleLavorazioni: core.lavorazioni.length,
    lavorazioneAttiva: mezzoHaLavorazioneAttivaDb(core.mezzoGestito, core.lavorazioni),
    documentiCount: core.documentiRows.length,
    preventiviCount: core.preventiviRows.length,
  };
}

function buildTimeline(core: MezzoHubCore): MezzoTimelineItem[] {
  const items: MezzoTimelineItem[] = [];

  for (const lav of core.lavorazioni) {
    const at = lav.data_ingresso?.trim() ? lav.data_ingresso : lav.created_at;
    const targetBadge =
      lav.target_type === "telaio" || lav.target_type === "attrezzatura"
        ? interventoTargetBadge(lav.target_type)
        : undefined;
    items.push({
      id: `lav-${lav.id}`,
      kind: "lavorazione",
      at,
      title: `Lavorazione · ${labelLavorazioneStatoDb(lav.stato)}`,
      subtitle: (lav.note ?? "").trim() || undefined,
      targetBadge,
      ref: {
        lavorazioneId: lav.id,
        origine: lav.archived === true ? "storico" : "attiva",
      },
    });
  }

  for (const log of core.logRows) {
    items.push({
      id: `log-${log.id}`,
      kind: "log",
      at: log.created_at,
      title: `Anagrafica · ${log.azione}`,
      subtitle: (() => {
        const autore = logAutoreLabel(log, null, "");
        return autore !== "Sistema" ? autore : undefined;
      })(),
    });
  }

  for (const mov of core.movimentiRows) {
    if (!mov.lavorazione_id) continue;
    items.push({
      id: `mov-${mov.id}`,
      kind: "movimento",
      at: mov.created_at,
      title: `${mov.tipo === "entrata" ? "Entrata magazzino" : "Uscita magazzino"} · ${mov.quantita} pz`,
      subtitle: `Ricambio ${mov.ricambio_id.slice(0, 8)}…`,
      ref: { lavorazioneId: mov.lavorazione_id, origine: "attiva" },
    });
  }

  for (const row of core.lifecycleRows ?? []) {
    if (row.mezzo_id !== core.mezzoGestito.id) continue;
    items.push({
      id: `life-${row.source_id}`,
      kind: "lifecycle",
      at: row.event_at,
      title: row.label,
      subtitle: row.event_subtype,
    });
  }

  items.sort((a, b) => {
    const tb = new Date(b.at).getTime();
    const ta = new Date(a.at).getTime();
    if (tb !== ta) return tb - ta;
    return b.id.localeCompare(a.id);
  });
  return items;
}

function assembleHubData(core: MezzoHubCore): MezzoHubData {
  const mezzoRow = mezzoGestitoToEmbedRow(core.mezzoGestito);
  return {
    mezzoId: core.mezzoGestito.id,
    mezzoRow,
    lavorazioni: core.lavorazioni,
    interventi: interventiMezzoDaLavorazioniDb(core.mezzoGestito, core.lavorazioni),
    preventivi: core.preventiviRows.map((r) => preventivoRowToRecordStub(r, mezzoRow)),
    documenti: core.documentiRows.map(documentoRowToGestionale),
    log: core.logRows.map((row) => logModificaRowToMezziHubLogEntry(row)),
    movimenti: core.movimentiRows,
    kpi: deriveKpi(core),
    timeline: buildTimeline(core),
  };
}

/** Solo composizione dati già risolti dalla cache (nessun fetch). */
export const mezzoDomainService = {
  composeHubData(snapshot: MezzoQueriesSnapshot): MezzoHubData | null {
    const core = toCore(snapshot);
    if (!core) return null;
    return assembleHubData(core);
  },

  composeKpi(snapshot: MezzoQueriesSnapshot): MezzoHubKpi | null {
    const core = toCore(snapshot);
    if (!core) return null;
    return deriveKpi(core);
  },

  composeTimeline(snapshot: MezzoQueriesSnapshot): MezzoTimelineItem[] | null {
    const core = toCore(snapshot);
    if (!core) return null;
    return buildTimeline(core);
  },
};
