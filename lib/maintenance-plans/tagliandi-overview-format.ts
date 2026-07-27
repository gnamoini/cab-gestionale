import type { MaintenanceIntervalType } from "@/lib/maintenance-plans/maintenance-enums";
import { MAINTENANCE_INTERVAL_TYPE_LABELS } from "@/lib/maintenance-plans/maintenance-enums";
import type { TagliandiOverviewRow } from "@/lib/maintenance-plans/v2-types";

function fmtNum(n: number): string {
  // Locale-independent thousands (it-IT grouping differs across ICU builds).
  return Math.round(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function fmtDate(ymd: string | null): string {
  if (!ymd) return "—";
  try {
    return new Date(`${ymd}T12:00:00`).toLocaleDateString("it-IT");
  } catch {
    return ymd;
  }
}

function winningType(row: TagliandiOverviewRow): MaintenanceIntervalType {
  const fromTrigger = row.triggerReason ?? row.explainability?.trigger_reason;
  if (fromTrigger === "ore" || fromTrigger === "km" || fromTrigger === "giorni" || fromTrigger === "mesi") {
    return fromTrigger;
  }
  return row.intervalType;
}

function unitLabel(type: MaintenanceIntervalType): string {
  return MAINTENANCE_INTERVAL_TYPE_LABELS[type];
}

/** Unità contatore veicolo (km/ore), anche se la scadenza vincente è calendario. */
function meterType(row: TagliandiOverviewRow): "km" | "ore" | null {
  if (row.intervalType === "km" || row.intervalType === "ore") return row.intervalType;
  const alts =
    row.explainability?.groups.flatMap((g) => g.alternatives) ?? [];
  if (alts.some((a) => a.type === "km")) return "km";
  if (alts.some((a) => a.type === "ore")) return "ore";
  const win = winningType(row);
  if (win === "km" || win === "ore") return win;
  return null;
}

function formatMeter(value: number, type: "km" | "ore"): string {
  return `${fmtNum(value)} ${unitLabel(type)}`;
}

/** Valore contatore attuale con unità. */
export function formatOverviewCurrentValue(row: TagliandiOverviewRow): string {
  const meter = meterType(row);
  if (meter) return formatMeter(row.currentValue, meter);
  const type = winningType(row);
  if (type === "mesi" || type === "giorni") {
    return row.currentValue ? fmtNum(row.currentValue) : "—";
  }
  return `${fmtNum(row.currentValue)} ${unitLabel(type)}`;
}

/** Data ultimo tagliando. */
export function formatOverviewUltimoData(row: TagliandiOverviewRow): string {
  return fmtDate(row.ultimoPerformedAt);
}

/** Contatore al momento dell'ultimo tagliando (km/ore fatti). */
export function formatOverviewValoreFatto(row: TagliandiOverviewRow): string {
  if (row.ultimoValueAtService == null) return "—";
  const meter = meterType(row);
  if (meter) return formatMeter(row.ultimoValueAtService, meter);
  return fmtNum(row.ultimoValueAtService);
}

/** Giorno previsto per il prossimo tagliando. */
export function formatOverviewGiornoPrevisto(row: TagliandiOverviewRow): string {
  return fmtDate(row.nextDateEstimated);
}

/**
 * Contatore previsto al prossimo tagliando (km/ore).
 * Preferisce alternative km/ore in explainability; altrimenti current+remaining se vincente è meter.
 */
export function formatOverviewValorePrevisto(row: TagliandiOverviewRow): string {
  const meter = meterType(row);
  if (!meter) return "—";

  const meterAlt = row.explainability?.groups
    .flatMap((g) => g.alternatives)
    .find((a) => a.type === meter);
  if (meterAlt != null) {
    return formatMeter(Math.round(row.currentValue + meterAlt.remaining), meter);
  }

  const win = winningType(row);
  if ((win === "km" || win === "ore") && row.remainingValue != null) {
    return formatMeter(Math.round(row.currentValue + row.remainingValue), meter);
  }

  if (row.ultimoValueAtService != null && (row.intervalType === "km" || row.intervalType === "ore")) {
    return formatMeter(row.ultimoValueAtService + row.intervalValue, meter);
  }

  return "—";
}
