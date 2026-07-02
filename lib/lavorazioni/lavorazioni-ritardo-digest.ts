import type { QueryClient } from "@tanstack/react-query";
import { splitLavorazioniListRowsForReport } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import { getLavorazioniListFromCache } from "@/lib/lavorazioni/find-lavorazione-in-list-cache";
import { countInterventiInRitardo } from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { KPI_OPEN_LATE_DAYS_THRESHOLD } from "@/lib/report/kpi-performance/kpi-performance-constants";

export type LavorazioniRitardoDigestPayload = {
  dateYmd: string;
  count: number;
  sogliaGiorni: number;
  createdAt: string;
};

export function buildLavorazioniRitardoDigestPayload(
  qc: QueryClient,
  now = new Date(),
): LavorazioniRitardoDigestPayload | null {
  const rows = getLavorazioniListFromCache(qc);
  if (!rows.length) return null;
  const { attive } = splitLavorazioniListRowsForReport(rows);
  const count = countInterventiInRitardo(attive, now, KPI_OPEN_LATE_DAYS_THRESHOLD);
  if (count <= 0) return null;
  return {
    dateYmd: now.toISOString().slice(0, 10),
    count,
    sogliaGiorni: KPI_OPEN_LATE_DAYS_THRESHOLD,
    createdAt: now.toISOString(),
  };
}

export function formatLavorazioniRitardoDigestBody(payload: LavorazioniRitardoDigestPayload): string {
  const n = payload.count;
  const label = n === 1 ? "lavorazione" : "lavorazioni";
  return `${n} ${label} oltre ${payload.sogliaGiorni} giorni dall'ingresso. Verifica priorità e avanzamento.`;
}

export function lavorazioniRitardoDigestStoreKey(dateYmd: string): string {
  return `lav-late:${dateYmd}`;
}

export function buildLavorazioniRitardoDigestNotification(
  payload: LavorazioniRitardoDigestPayload,
): {
  kind: "lavorazioni_ritardo_digest";
  id: string;
  dateYmd: string;
  count: number;
  sogliaGiorni: number;
  createdAt: string;
} {
  return {
    kind: "lavorazioni_ritardo_digest",
    id: lavorazioniRitardoDigestStoreKey(payload.dateYmd),
    dateYmd: payload.dateYmd,
    count: payload.count,
    sogliaGiorni: payload.sogliaGiorni,
    createdAt: payload.createdAt,
  };
}
