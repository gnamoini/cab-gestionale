import { CONTROL_TOWER_LATE_INGRESS_DAYS } from "@/lib/dashboard/control-tower-constants";
import {
  estimateDaysUnderMinimum,
  isAccettazioneStato,
  isAttesaRicambiStato,
  isStagnationSensitiveStato,
  stagnationThresholdDays,
} from "@/lib/dashboard/operational-health-criticality";
import { isLavorazioneInCorso } from "@/lib/lavorazioni/archived";
import { migrateStatoConfigId } from "@/lib/lavorazioni/stati-dynamic";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

export const HEALTH_SCORE_FACTOR_SOURCE_LIMIT = 12;

function daysBetween(startIso: string, anchor: Date): number {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, (anchor.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function lavIngressIso(row: LavorazioneListRow): string {
  return row.data_ingresso?.trim() || row.created_at;
}

function lavUpdatedAt(row: LavorazioneListRow): string {
  return row.updated_at ?? row.created_at ?? new Date(0).toISOString();
}

function isActiveLavorazione(row: LavorazioneListRow): boolean {
  if (row.deleted_at) return false;
  return isLavorazioneInCorso(row);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function collectLateIngressLavorazioneIds(
  lavRows: readonly LavorazioneListRow[],
  anchor: Date,
  limit = HEALTH_SCORE_FACTOR_SOURCE_LIMIT,
): string[] {
  const ranked: { id: string; days: number }[] = [];
  for (const row of lavRows) {
    if (!isActiveLavorazione(row)) continue;
    const days = daysBetween(lavIngressIso(row), anchor);
    if (days <= CONTROL_TOWER_LATE_INGRESS_DAYS) continue;
    ranked.push({ id: row.id, days });
  }
  ranked.sort((a, b) => b.days - a.days);
  return ranked.slice(0, limit).map((r) => r.id);
}

export function collectInactiveLavorazioneIds(
  lavRows: readonly LavorazioneListRow[],
  anchor: Date,
  stati?: readonly StatoLavorazioneConfig[],
  limit = HEALTH_SCORE_FACTOR_SOURCE_LIMIT,
): string[] {
  const byStatoDays = new Map<string, number[]>();
  const rowMeta: { id: string; statoKey: string; days: number }[] = [];

  for (const row of lavRows) {
    if (!isActiveLavorazione(row)) continue;
    if (!isStagnationSensitiveStato(row.stato, stati)) continue;
    const statoKey = migrateStatoConfigId(row.stato.trim());
    const days = daysBetween(lavUpdatedAt(row), anchor);
    const bucket = byStatoDays.get(statoKey) ?? [];
    bucket.push(days);
    byStatoDays.set(statoKey, bucket);
    rowMeta.push({ id: row.id, statoKey, days });
  }

  const ranked: { id: string; excess: number }[] = [];
  for (const row of rowMeta) {
    const group = byStatoDays.get(row.statoKey) ?? [];
    const threshold = stagnationThresholdDays(median(group), {
      attesaRicambi: isAttesaRicambiStato(row.statoKey),
      accettazione: isAccettazioneStato(row.statoKey),
    });
    if (row.days <= threshold) continue;
    ranked.push({ id: row.id, excess: row.days - threshold });
  }
  ranked.sort((a, b) => b.excess - a.excess);
  return ranked.slice(0, limit).map((r) => r.id);
}

export function collectStockCriticalRicambioIds(
  ricambi: readonly RicambioMagazzino[],
  magLog: readonly MagazzinoChangeLogEntry[],
  anchor: Date,
  limit = HEALTH_SCORE_FACTOR_SOURCE_LIMIT,
): string[] {
  const ranked: { id: string; days: number }[] = [];
  for (const ricambio of ricambi) {
    if (ricambio.scortaMinima <= 0 || ricambio.scorta >= ricambio.scortaMinima) continue;
    const days = estimateDaysUnderMinimum(ricambio, magLog, anchor);
    ranked.push({ id: ricambio.id, days });
  }
  ranked.sort((a, b) => b.days - a.days);
  return ranked.slice(0, limit).map((r) => r.id);
}
