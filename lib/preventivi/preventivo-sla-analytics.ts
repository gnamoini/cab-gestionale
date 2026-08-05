import type { PreventivoRecord } from "@/lib/preventivi/types";
import {
  isClosedCustomerDecision,
  isPreventivoTimeoutAccepted,
} from "@/lib/preventivi/preventivo-stats-eligibility";

export type PreventivoSlaMetrics = {
  inviati: number;
  accettati: number;
  rifiutati: number;
  inAttesa: number;
  timeout: number;
  conversionPct: number | null;
  avgResponseHours: number | null;
  avgAcceptanceHours: number | null;
  timeoutPct: number | null;
  rejectPct: number | null;
};

function hoursBetween(start: string | null | undefined, end: string | null | undefined): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms / 3_600_000;
}

export function buildPreventivoSlaMetrics(preventivi: readonly PreventivoRecord[]): PreventivoSlaMetrics {
  let inviati = 0;
  let accettati = 0;
  let rifiutati = 0;
  let inAttesa = 0;
  let timeout = 0;
  const responseHours: number[] = [];
  const acceptanceHours: number[] = [];

  for (const p of preventivi) {
    if (!p.inviatoAt) continue;
    inviati += 1;

    if (p.statoCliente === "pending") {
      inAttesa += 1;
      continue;
    }
    if (p.statoCliente === "accettato") {
      accettati += 1;
      if (isPreventivoTimeoutAccepted({ statoCliente: p.statoCliente, metodoAccettazione: p.metodoAccettazione ?? null })) timeout += 1;
      const h = hoursBetween(p.inviatoAt, p.accettatoAt);
      if (h != null) acceptanceHours.push(h);
      if (isClosedCustomerDecision(p)) {
        const rh = hoursBetween(p.inviatoAt, p.accettatoAt);
        if (rh != null) responseHours.push(rh);
      }
    } else if (p.statoCliente === "rifiutato") {
      rifiutati += 1;
      const rh = hoursBetween(p.inviatoAt, p.rifiutatoAt);
      if (rh != null) responseHours.push(rh);
    }
  }

  const closed = accettati + rifiutati;
  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

  return {
    inviati,
    accettati,
    rifiutati,
    inAttesa,
    timeout,
    conversionPct: closed > 0 ? Math.round((accettati / closed) * 1000) / 10 : null,
    avgResponseHours: avg(responseHours),
    avgAcceptanceHours: avg(acceptanceHours),
    timeoutPct: accettati > 0 ? Math.round((timeout / accettati) * 1000) / 10 : null,
    rejectPct: closed > 0 ? Math.round((rifiutati / closed) * 1000) / 10 : null,
  };
}
