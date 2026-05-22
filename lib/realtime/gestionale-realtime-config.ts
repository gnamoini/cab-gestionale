import type { QueryClient } from "@tanstack/react-query";
import { invalidateClientPortalQueries } from "@/lib/lavorazioni/client-portal-invalidate";
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
      void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries, refetchType: "active" });
      void invalidateClientPortalQueries(qc);
    },
  },
  {
    table: "lavorazione_documents",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries, refetchType: "active" });
      void invalidateClientPortalQueries(qc);
    },
  },
  {
    table: "mezzi",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.mezzi });
      void qc.invalidateQueries({ queryKey: QK.mezzoQueries });
      void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries });
      void invalidateClientPortalQueries(qc);
    },
  },
  {
    table: "magazzino_ricambi",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.magazzino });
      void qc.invalidateQueries({ queryKey: QK.movimenti });
      void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries, refetchType: "active" });
      void invalidateClientPortalQueries(qc);
    },
  },
  {
    table: "movimenti_ricambi",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.movimenti });
      void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries, refetchType: "active" });
      void qc.invalidateQueries({ queryKey: QK.magazzino });
      void invalidateClientPortalQueries(qc);
    },
  },
  {
    table: "preventivi",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.preventivi });
      void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries });
      void invalidateClientPortalQueries(qc);
    },
  },
  {
    table: "documenti",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.documenti, refetchType: "active" });
      void qc.invalidateQueries({ queryKey: QK.mezzoQueries, refetchType: "active" });
      void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries, refetchType: "active" });
      void invalidateClientPortalQueries(qc);
    },
  },
  {
    table: "scheda_lavorazione",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.schede });
      void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries });
      void invalidateClientPortalQueries(qc);
    },
  },
  {
    table: "log_modifiche",
    invalidate: (qc) => {
      void qc.invalidateQueries({ queryKey: QK.log });
      void invalidateClientPortalQueries(qc);
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
