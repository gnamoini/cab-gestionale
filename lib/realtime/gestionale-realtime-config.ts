import type { QueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/invalidate-related";

/** Intervallo polling di fallback quando Realtime non è connesso (ms). */
export const GESTIONALE_REALTIME_POLL_MS = 20_000;

/** Debounce invalidazioni cache dopo burst di eventi (ms). */
export const GESTIONALE_REALTIME_DEBOUNCE_MS = 350;

/** Tentativi riconnessione subscription. */
export const GESTIONALE_REALTIME_RETRY_ATTEMPTS = 3;

export type GestionaleRealtimeTableSpec = {
  table: string;
  /** Chiavi React Query da invalidare su cambio tabella. */
  invalidate: (qc: QueryClient) => void;
};

export const GESTIONALE_REALTIME_TABLES: GestionaleRealtimeTableSpec[] = [
  {
    table: "lavorazioni",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries });
      void qc.invalidateQueries({ queryKey: QK.clientLavorazioniList });
      void qc.invalidateQueries({ queryKey: QK.clientLavorazioniDetail });
    },
  },
  {
    table: "lavorazione_documents",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries });
      void qc.invalidateQueries({ queryKey: QK.clientLavorazioniList });
      void qc.invalidateQueries({ queryKey: QK.clientLavorazioniDetail });
    },
  },
  {
    table: "mezzi",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.mezzi });
      void qc.invalidateQueries({ queryKey: QK.mezzoQueries });
      void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries });
      void qc.invalidateQueries({ queryKey: QK.clientLavorazioniList });
      void qc.invalidateQueries({ queryKey: QK.clientLavorazioniDetail });
    },
  },
  {
    table: "magazzino_ricambi",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.magazzino });
      void qc.invalidateQueries({ queryKey: QK.movimenti });
    },
  },
  {
    table: "movimenti_ricambi",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.movimenti });
      void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries });
      void qc.invalidateQueries({ queryKey: QK.magazzino });
    },
  },
  {
    table: "preventivi",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.preventivi });
      void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries });
    },
  },
  {
    table: "documenti",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.documenti });
      void qc.invalidateQueries({ queryKey: QK.mezzoQueries });
    },
  },
  {
    table: "scheda_lavorazione",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.schede });
      void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries });
      void qc.invalidateQueries({ queryKey: QK.clientLavorazioniList });
      void qc.invalidateQueries({ queryKey: QK.clientLavorazioniDetail });
    },
  },
  {
    table: "log_modifiche",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.log });
      void qc.invalidateQueries({ queryKey: QK.clientLavorazioniList });
      void qc.invalidateQueries({ queryKey: QK.clientLavorazioniDetail });
    },
  },
  {
    table: "support_notes",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.supportNotes });
    },
  },
  {
    table: "segnalazioni",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.supportNotes });
      void qc.invalidateQueries({ queryKey: QK.segnalazioni });
    },
  },
];

export function invalidateAllGestionaleOperationalQueries(qc: QueryClient): void {
  for (const spec of GESTIONALE_REALTIME_TABLES) {
    spec.invalidate(qc);
  }
}
