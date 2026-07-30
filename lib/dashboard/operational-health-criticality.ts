import type { CampoChangeLike } from "@/lib/gestionale-log/view-model";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { isLavorazioneInCorso } from "@/lib/lavorazioni/archived";
import { migrateStatoConfigId, statoLavorazioneLabel } from "@/lib/lavorazioni/stati-dynamic";
import { CONTROL_TOWER_STALE_UPDATE_DAYS } from "@/lib/dashboard/control-tower-constants";

function parseQty(value: string): number | null {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

function isSottoScorta(scorta: number, scortaMinima: number): boolean {
  return scortaMinima > 0 && scorta < scortaMinima;
}

function daysBetween(startIso: string, anchor: Date): number {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return 1;
  return Math.max(0, (anchor.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function reverseLogState(
  tipo: MagazzinoChangeLogEntry["tipo"],
  changes: CampoChangeLike[],
  state: { scorta: number; scortaMinima: number },
): { scorta: number; scortaMinima: number; createdUnder: boolean } {
  const next = { ...state };
  for (const ch of changes) {
    if (ch.campo === "Scorta") {
      const p = parseQty(ch.prima);
      if (p != null) next.scorta = p;
    } else if (ch.campo === "Scorta minima") {
      const p = parseQty(ch.prima);
      if (p != null) next.scortaMinima = p;
    }
  }
  if (tipo === "aggiunta") {
    const dopoScorta = parseQty(changes.find((c) => c.campo === "Scorta")?.dopo ?? "") ?? state.scorta;
    const dopoMin =
      parseQty(changes.find((c) => c.campo === "Scorta minima")?.dopo ?? "") ?? state.scortaMinima;
    return {
      scorta: Math.max(dopoMin, dopoScorta + 1),
      scortaMinima: dopoMin,
      createdUnder: isSottoScorta(dopoScorta, dopoMin),
    };
  }
  return { ...next, createdUnder: false };
}

/** Giorni continui sotto scorta minima stimati dal log magazzino. */
export function estimateDaysUnderMinimum(
  ricambio: RicambioMagazzino,
  magLog: readonly MagazzinoChangeLogEntry[],
  anchor = new Date(),
): number {
  if (!isSottoScorta(ricambio.scorta, ricambio.scortaMinima)) return 0;

  const entries = magLog
    .filter((e) => e.ricambioId === ricambio.id && !e.annullato)
    .sort((a, b) => b.at.localeCompare(a.at));

  let scorta = ricambio.scorta;
  let scortaMinima = ricambio.scortaMinima;
  let underSinceIso: string | null = null;

  for (const entry of entries) {
    const wasUnder = isSottoScorta(scorta, scortaMinima);
    const prev = reverseLogState(entry.tipo, entry.changes, { scorta, scortaMinima });
    scorta = prev.scorta;
    scortaMinima = prev.scortaMinima;

    if (prev.createdUnder) {
      underSinceIso = entry.at;
      break;
    }
    if (wasUnder && !isSottoScorta(scorta, scortaMinima)) {
      underSinceIso = entry.at;
      break;
    }
  }

  const startIso = underSinceIso ?? ricambio.dataUltimaModifica;
  return daysBetween(startIso, anchor);
}

/** Peso penalità: poche ore ≈ neutro, settimane = impatto forte. */
export function sottoScortaDurationWeight(days: number, deficitRatio = 1): number {
  const safeRatio = Math.max(0.5, Math.min(2, deficitRatio));
  if (days < 0.25) return 0;
  if (days < 1) return 0.15 * safeRatio;
  if (days < 3) return 0.45 * safeRatio;
  if (days < 7) return 1 * safeRatio;
  if (days < 21) return 2 * safeRatio;
  return 3 * safeRatio;
}

export type SottoScortaCriticality = {
  count: number;
  maxDays: number;
  weightedSeverity: number;
};

export function computeSottoScortaCriticality(
  ricambi: readonly RicambioMagazzino[],
  magLog: readonly MagazzinoChangeLogEntry[],
  anchor = new Date(),
): SottoScortaCriticality {
  let count = 0;
  let maxDays = 0;
  let weightedSeverity = 0;

  for (const ricambio of ricambi) {
    if (!isSottoScorta(ricambio.scorta, ricambio.scortaMinima)) continue;
    count += 1;
    const days = estimateDaysUnderMinimum(ricambio, magLog, anchor);
    maxDays = Math.max(maxDays, days);
    const deficitRatio =
      ricambio.scortaMinima > 0 ? (ricambio.scortaMinima - ricambio.scorta) / ricambio.scortaMinima : 1;
    weightedSeverity += sottoScortaDurationWeight(days, deficitRatio);
  }

  return { count, maxDays, weightedSeverity };
}

export type StaleLavorazioniCriticality = {
  count: number;
  weightedExcessDays: number;
};

export type InactiveLavorazioniCriticality = StaleLavorazioniCriticality & {
  /** Etichette stato con almeno una lavorazione oltre soglia. */
  statoLabels: string[];
  maxDays: number;
};

const STAGNATION_STATE_IDS = new Set([
  "accettazione",
  "attesa_preventivo",
  "attesa_ricambi",
  "in_coda",
  "da_lavorare",
]);

/**
 * Lead time fornitore tipico: oltre questa soglia la stagnazione in attesa ricambi
 * resta segnalata ma con peso soft (non dipende dall'officina).
 */
export const ATTESA_RICAMBI_SUPPLIER_GRACE_DAYS = 7;

/** Peso ritardo ingresso se in attesa ricambi oltre grace fornitore (colpa fornitore). */
export const ATTESA_RICAMBI_LATE_INGRESS_WEIGHT = 0.3;

/** Excess oltre soglia: peso ridotto + cap basso vs altri stati di attesa. */
const ATTESA_RICAMBI_EXCESS_WEIGHT = 0.3;
const ATTESA_RICAMBI_EXCESS_CAP_DAYS = 7;

/** Stati di attesa/inattività — non penalizzare «in lavorazione» anche se lunga. */
export function isStagnationSensitiveStato(
  statoId: string,
  stati?: readonly StatoLavorazioneConfig[],
): boolean {
  const id = migrateStatoConfigId(statoId.trim());
  if (STAGNATION_STATE_IDS.has(id)) return true;
  const label = (stati ? statoLavorazioneLabel(statoId, stati) : id).toLowerCase();
  if (label.includes("accettazione")) return true;
  if (label.includes("da lavorare")) return true;
  if (label.includes("attesa") && (label.includes("preventivo") || label.includes("ricambi"))) return true;
  return false;
}

/** Attesa ricambi (id canonico o label custom). */
export function isAttesaRicambiStato(
  statoId: string,
  stati?: readonly StatoLavorazioneConfig[],
): boolean {
  const id = migrateStatoConfigId(statoId.trim());
  if (id === "attesa_ricambi") return true;
  const label = (stati ? statoLavorazioneLabel(statoId, stati) : id).toLowerCase();
  return label.includes("attesa") && label.includes("ricambi");
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function stagnationThresholdDays(
  medianDays: number,
  opts?: { attesaRicambi?: boolean },
): number {
  const base = Math.max(5, medianDays * 1.4, medianDays + 3);
  if (!opts?.attesaRicambi) return base;
  // Grace fornitore 7gg + margine sulla mediana: ritardi sistemici non gonfiano lo score.
  return Math.max(base, ATTESA_RICAMBI_SUPPLIER_GRACE_DAYS, medianDays + ATTESA_RICAMBI_SUPPLIER_GRACE_DAYS);
}

function stagnationExcessWeight(excessDays: number, attesaRicambi: boolean): number {
  if (attesaRicambi) {
    // ponytail: soft cap lead-time fornitore — upgrade: lead time per fornitore da magazzino
    return (Math.min(ATTESA_RICAMBI_EXCESS_CAP_DAYS, excessDays) / 7) * ATTESA_RICAMBI_EXCESS_WEIGHT;
  }
  return Math.min(21, excessDays) / 7;
}

function lavUpdatedAt(row: LavorazioneListRow): string {
  return row.updated_at ?? row.created_at ?? new Date(0).toISOString();
}

/** Peso nel conteggio ritardo ingresso: soft se in attesa ricambi da tempo (lead-time fornitore). */
export function lateIngressWeight(
  row: LavorazioneListRow,
  anchor: Date,
  stati?: readonly StatoLavorazioneConfig[],
): number {
  if (!isAttesaRicambiStato(row.stato, stati)) return 1;
  const daysInStato = daysBetween(lavUpdatedAt(row), anchor);
  if (daysInStato < ATTESA_RICAMBI_SUPPLIER_GRACE_DAYS) return 1;
  return ATTESA_RICAMBI_LATE_INGRESS_WEIGHT;
}

function isActiveLavorazione(row: LavorazioneListRow): boolean {
  if (row.deleted_at) return false;
  return isLavorazioneInCorso(row);
}

export function computeInactiveLavorazioniCriticality(
  lavRows: readonly LavorazioneListRow[],
  anchor = new Date(),
  stati?: readonly StatoLavorazioneConfig[],
): InactiveLavorazioniCriticality {
  const byStatoDays = new Map<string, number[]>();
  const rowMeta: { statoKey: string; statoLabel: string; days: number }[] = [];

  for (const row of lavRows) {
    if (!isActiveLavorazione(row)) continue;
    if (!isStagnationSensitiveStato(row.stato, stati)) continue;
    const statoKey = migrateStatoConfigId(row.stato.trim());
    const statoLabel = stati ? statoLavorazioneLabel(row.stato, stati) : statoKey;
    const days = daysBetween(lavUpdatedAt(row), anchor);
    const bucket = byStatoDays.get(statoKey) ?? [];
    bucket.push(days);
    byStatoDays.set(statoKey, bucket);
    rowMeta.push({ statoKey, statoLabel, days });
  }

  let count = 0;
  let weightedExcessDays = 0;
  let maxDays = 0;
  const statoLabels = new Set<string>();

  for (const row of rowMeta) {
    const group = byStatoDays.get(row.statoKey) ?? [];
    const med = median(group);
    const attesaRicambi = isAttesaRicambiStato(row.statoKey);
    const threshold = stagnationThresholdDays(med, { attesaRicambi });
    if (row.days <= threshold) continue;
    count += 1;
    maxDays = Math.max(maxDays, row.days);
    statoLabels.add(row.statoLabel);
    const excess = row.days - threshold;
    weightedExcessDays += stagnationExcessWeight(excess, attesaRicambi);
  }

  return {
    count,
    weightedExcessDays,
    statoLabels: [...statoLabels],
    maxDays,
  };
}

/** @deprecated Usare computeInactiveLavorazioniCriticality per lo health score. */
export function computeStaleLavorazioniCriticality(
  lavRows: readonly LavorazioneListRow[],
  anchor = new Date(),
  staleDays = CONTROL_TOWER_STALE_UPDATE_DAYS,
): StaleLavorazioniCriticality {
  let count = 0;
  let weightedExcessDays = 0;

  for (const row of lavRows) {
    if (!isActiveLavorazione(row)) continue;
    const days = daysBetween(lavUpdatedAt(row), anchor);
    if (days <= staleDays) continue;
    count += 1;
    const excess = days - staleDays;
    weightedExcessDays += Math.min(14, excess) / 7;
  }

  return { count, weightedExcessDays };
}
