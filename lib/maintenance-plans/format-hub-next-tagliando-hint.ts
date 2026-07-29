import type { MaintenanceIntervalType, MaintenanceUrgency } from "@/lib/maintenance-plans/maintenance-enums";
import type { ForecastExplainability, TriggerAlternative } from "@/lib/maintenance-plans/forecast/trigger-group-forecast";
import type { VehicleMaintenanceConfigView } from "@/lib/maintenance-plans/v2-types";

export type HubNextTagliandoHint = {
  text: string;
  tone: "neutral" | "warning" | "danger";
};

export type HubNextTagliandoHintInput = Pick<
  VehicleMaintenanceConfigView,
  | "explainability"
  | "remainingValue"
  | "nextDateEstimated"
  | "currentValue"
  | "triggerReason"
  | "urgency"
>;

function fmtNum(n: number): string {
  return Math.round(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function fmtDate(ymd: string | null | undefined): string | null {
  if (!ymd?.trim()) return null;
  try {
    return new Date(`${ymd.slice(0, 10)}T12:00:00`).toLocaleDateString("it-IT");
  } catch {
    return ymd;
  }
}

function altOverdue(alt: TriggerAlternative): boolean {
  return alt.isOverdue || alt.remaining <= 0;
}

function calendarRemainingLabel(type: "mesi" | "giorni", remainingDays: number, overdue: boolean): string {
  const abs = Math.abs(remainingDays);
  if (type === "giorni") {
    const days = Math.max(1, Math.round(abs));
    return overdue ? `${days} giorni` : `${days} giorni`;
  }
  const months = Math.max(1, Math.round(abs / 30));
  return overdue ? `${months} mesi` : `${months} mesi`;
}

function meterRemainingLabel(type: "ore" | "km", remaining: number, overdue: boolean): string {
  const abs = Math.max(1, Math.round(Math.abs(remaining)));
  const unit = type === "km" ? "km" : "ore";
  return overdue ? `${abs} ${unit}` : `${abs} ${unit}`;
}

function fragmentForAlt(alt: TriggerAlternative, overdue: boolean): string | null {
  if (alt.type === "ore" || alt.type === "km") {
    return meterRemainingLabel(alt.type, alt.remaining, overdue);
  }
  if (alt.type === "mesi" || alt.type === "giorni") {
    return calendarRemainingLabel(alt.type, alt.remaining, overdue);
  }
  return null;
}

function findAlt(alternatives: TriggerAlternative[], type: MaintenanceIntervalType): TriggerAlternative | undefined {
  return alternatives.find((a) => a.type === type);
}

function resolveDueDate(
  explainability: ForecastExplainability | null,
  nextDateEstimated: string | null,
): string | null {
  return explainability?.due_date ?? nextDateEstimated;
}

function formatKmDateCombo(
  kmAlt: TriggerAlternative,
  currentValue: number,
  dueDate: string | null,
  overdue: boolean,
): string | null {
  const dateLabel = fmtDate(dueDate);
  if (!dateLabel) return null;
  const targetKm = Math.round(currentValue + kmAlt.remaining);
  if (overdue) {
    return `Tagliando scaduto: oltre ${fmtNum(targetKm)} km o dopo il ${dateLabel}`;
  }
  return `Tagliando previsto a ${fmtNum(targetKm)} km o entro ${dateLabel}`;
}

function formatOverdueHint(
  alternatives: TriggerAlternative[],
  winType: MaintenanceIntervalType | null,
  currentValue: number,
  remainingValue: number | null,
  explainability: ForecastExplainability | null,
  nextDateEstimated: string | null,
): string {
  const kmAlt = findAlt(alternatives, "km");
  const dueDate = resolveDueDate(explainability, nextDateEstimated);
  if (kmAlt && dueDate && (winType === "km" || winType === "mesi" || winType === "giorni")) {
    const combo = formatKmDateCombo(kmAlt, currentValue, dueDate, true);
    if (combo) return combo;
  }

  const winAlt = winType ? findAlt(alternatives, winType) : alternatives.find(altOverdue);
  if (winAlt) {
    const frag = fragmentForAlt(winAlt, true);
    if (frag) return `Tagliando scaduto da ${frag}`;
  }

  if (winType === "ore" || winType === "km") {
    const rem = remainingValue ?? 0;
    const abs = Math.max(1, Math.round(Math.abs(rem)));
    const unit = winType === "km" ? "km" : "ore";
    return `Tagliando scaduto da ${abs} ${unit}`;
  }

  if (winType === "mesi" || winType === "giorni") {
    const rem = remainingValue ?? alternatives.find((a) => a.type === winType)?.remaining ?? 0;
    const frag = calendarRemainingLabel(winType, rem, true);
    return `Tagliando scaduto da ${frag}`;
  }

  return "Tagliando scaduto";
}

function formatPlannedHint(
  alternatives: TriggerAlternative[],
  winType: MaintenanceIntervalType | null,
  currentValue: number,
  remainingValue: number | null,
  nextDateEstimated: string | null,
  explainability: ForecastExplainability | null,
): string {
  const kmAlt = findAlt(alternatives, "km");
  const dueDate = resolveDueDate(explainability, nextDateEstimated);
  if (kmAlt && dueDate && !altOverdue(kmAlt)) {
    const combo = formatKmDateCombo(kmAlt, currentValue, dueDate, false);
    if (combo) return combo;
  }

  const active = alternatives.filter((a) => !altOverdue(a) && a.remaining > 0);
  const oreAlt = findAlt(active, "ore");
  const mesiAlt = findAlt(active, "mesi");

  if (oreAlt && mesiAlt) {
    const oreFrag = fragmentForAlt(oreAlt, false);
    const mesiFrag = fragmentForAlt(mesiAlt, false);
    if (oreFrag && mesiFrag) {
      return `Prossimo tagliando previsto fra ${oreFrag} / ${mesiFrag}`;
    }
  }

  if (active.length >= 2) {
    const frags = active
      .map((a) => fragmentForAlt(a, false))
      .filter((f): f is string => Boolean(f));
    if (frags.length >= 2) {
      return `Prossimo tagliando previsto fra ${frags.join(" / ")}`;
    }
  }

  const winAlt = winType ? findAlt(active.length > 0 ? active : alternatives, winType) : active[0];
  if (winAlt) {
    const frag = fragmentForAlt(winAlt, false);
    if (frag) return `Prossimo tagliando previsto fra ${frag}`;
  }

  if ((winType === "ore" || winType === "km") && remainingValue != null && remainingValue > 0) {
    const unit = winType === "km" ? "km" : "ore";
    return `Prossimo tagliando previsto fra ${Math.round(remainingValue)} ${unit}`;
  }

  const dateLabel = fmtDate(dueDate);
  if (dateLabel) return `Prossimo tagliando previsto entro ${dateLabel}`;

  return "Pianificazione tagliando in corso";
}

function hintTone(urgency: MaintenanceUrgency, overdue: boolean): HubNextTagliandoHint["tone"] {
  if (overdue || urgency === "rosso") return "danger";
  if (urgency === "giallo" || urgency === "arancione") return "warning";
  return "neutral";
}

/** SSOT label compatto per hub mezzo — solo formattazione su forecast materializzato. */
export function formatHubNextTagliandoHint(input: HubNextTagliandoHintInput): HubNextTagliandoHint {
  const { explainability, remainingValue, nextDateEstimated, currentValue, triggerReason, urgency } = input;

  if (!explainability && remainingValue == null && !nextDateEstimated) {
    return { text: "Pianificazione tagliando in corso", tone: "neutral" };
  }

  const alternatives = explainability?.groups.flatMap((g) => g.alternatives) ?? [];
  const winType = (explainability?.trigger_reason ?? triggerReason) as MaintenanceIntervalType | null;
  const isOverdue =
    urgency === "rosso" ||
    (remainingValue != null && remainingValue <= 0) ||
    alternatives.some(altOverdue);

  if (isOverdue) {
    return {
      text: formatOverdueHint(
        alternatives,
        winType,
        currentValue,
        remainingValue,
        explainability,
        nextDateEstimated,
      ),
      tone: "danger",
    };
  }

  return {
    text: formatPlannedHint(
      alternatives,
      winType,
      currentValue,
      remainingValue,
      nextDateEstimated,
      explainability,
    ),
    tone: hintTone(urgency, false),
  };
}
