import type { ReportPeriodPreset } from "@/lib/report/date-ranges";

export type ReportPeriodGroup = "breve" | "calendario" | "lungo" | "personalizzato";

const GROUP_LABELS: Record<ReportPeriodGroup, string> = {
  breve: "Breve",
  calendario: "Calendario",
  lungo: "Lungo",
  personalizzato: "Personalizzato",
};

export type ReportPeriodPresetMeta = {
  id: ReportPeriodPreset;
  label: string;
  group: ReportPeriodGroup;
  /** Chip rapido in toolbar. */
  quick?: boolean;
};

export const REPORT_PERIOD_PRESETS: readonly ReportPeriodPresetMeta[] = [
  { id: "today", label: "Oggi", group: "breve", quick: true },
  { id: "yesterday", label: "Ieri", group: "breve" },
  { id: "last_7_days", label: "Ultimi 7 giorni", group: "breve", quick: true },
  { id: "last_30_days", label: "Ultimi 30 giorni", group: "breve", quick: true },
  { id: "current_week", label: "Settimana corrente", group: "calendario" },
  { id: "last_week", label: "Settimana scorsa", group: "calendario" },
  { id: "current_month", label: "Mese corrente", group: "calendario", quick: true },
  { id: "last_month", label: "Ultimo mese", group: "calendario" },
  { id: "last_3_months", label: "Ultimi 3 mesi", group: "calendario", quick: true },
  { id: "last_6_months", label: "Ultimi 6 mesi", group: "calendario" },
  { id: "current_quarter", label: "Trimestre corrente", group: "calendario" },
  { id: "last_quarter", label: "Trimestre precedente", group: "calendario" },
  { id: "ytd", label: "Anno corrente", group: "lungo", quick: true },
  { id: "previous_year", label: "Anno precedente", group: "lungo" },
  { id: "last_12_months", label: "Ultimi 12 mesi", group: "lungo" },
  { id: "last_3_years", label: "Ultimi 3 anni", group: "lungo" },
  { id: "custom", label: "Personalizzato", group: "personalizzato" },
] as const;

export const REPORT_PRESET_LABELS: Record<ReportPeriodPreset, string> = Object.fromEntries(
  REPORT_PERIOD_PRESETS.map((p) => [p.id, p.label]),
) as Record<ReportPeriodPreset, string>;

export const REPORT_QUICK_PRESET_IDS: readonly ReportPeriodPreset[] = REPORT_PERIOD_PRESETS.filter(
  (p) => p.quick,
).map((p) => p.id);

const PRESET_ID_SET = new Set<string>(REPORT_PERIOD_PRESETS.map((p) => p.id));

export function isReportPeriodPreset(value: string): value is ReportPeriodPreset {
  return PRESET_ID_SET.has(value);
}

/** Etichetta select con prefisso gruppo (flat list). */
export function reportPresetSelectLabel(meta: ReportPeriodPresetMeta): string {
  return `${GROUP_LABELS[meta.group]} · ${meta.label}`;
}

export function reportPeriodPresetSelectItems(): { value: ReportPeriodPreset; label: string }[] {
  return REPORT_PERIOD_PRESETS.map((p) => ({
    value: p.id,
    label: reportPresetSelectLabel(p),
  }));
}
