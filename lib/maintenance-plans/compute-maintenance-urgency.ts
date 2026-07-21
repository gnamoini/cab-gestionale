import type { MaintenanceUrgency } from "@/lib/maintenance-plans/maintenance-enums";

export function computeMaintenanceUrgency(input: {
  nextDateEstimated: string | null;
  remainingValue: number;
  today?: string;
}): MaintenanceUrgency {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  if (input.remainingValue <= 0) return "rosso";
  if (!input.nextDateEstimated) {
    return input.remainingValue <= 0 ? "rosso" : "giallo";
  }
  const days = daysUntil(today, input.nextDateEstimated);
  if (days < 0) return "rosso";
  if (days <= 7) return "arancione";
  if (days <= 30) return "giallo";
  return "verde";
}

function daysUntil(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00`).getTime();
  const b = new Date(`${to}T12:00:00`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export const URGENCY_LABELS: Record<MaintenanceUrgency, string> = {
  verde: "Oltre 30 giorni",
  giallo: "Entro 30 giorni",
  arancione: "Entro 7 giorni",
  rosso: "Scaduto",
};

export const URGENCY_ROW_CLASS: Record<MaintenanceUrgency, string> = {
  verde: "",
  giallo: "bg-amber-50/80 dark:bg-amber-950/20",
  arancione: "bg-orange-50/80 dark:bg-orange-950/20",
  rosso: "bg-red-50/80 dark:bg-red-950/20",
};
