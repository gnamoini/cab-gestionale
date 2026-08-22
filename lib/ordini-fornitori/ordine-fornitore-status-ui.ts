import type { CSSProperties } from "react";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import type { OrdineFornitoreStatus } from "@/lib/ordini-fornitori/types";

export const ORDINE_FORNITORE_EDITOR_STATUSES = [
  "bozza",
  "inviato",
  "in_consegna",
  "consegnato",
] as const satisfies readonly OrdineFornitoreStatus[];

export const ORDINE_FORNITORE_ALL_STATUSES = [
  ...ORDINE_FORNITORE_EDITOR_STATUSES,
  "annullato",
] as const satisfies readonly OrdineFornitoreStatus[];

export type OrdineFornitoreStatusSelectItem = {
  value: string;
  label: string;
  pillStyle?: CSSProperties;
};

const STATUS_LABEL: Record<OrdineFornitoreStatus, string> = {
  bozza: "Bozza",
  inviato: "Inviato",
  in_consegna: "In consegna",
  consegnato: "Consegnato",
  annullato: "Annullato",
};

const STATUS_HEX: Record<OrdineFornitoreStatus, string> = {
  bozza: "#64748b",
  inviato: "#2563eb",
  in_consegna: "#9333ea",
  consegnato: "#16a34a",
  annullato: "#dc2626",
};

/** Shell pill select — allineato al campo form (`dsInput` height). */
export const ORDINE_FORNITORE_STATUS_PILL_SHELL =
  "min-h-[42px] rounded-[var(--ds-radius-lg)] border border-black/10 shadow-[var(--cab-shadow-sm)] dark:border-white/10";

export const ORDINE_FORNITORE_FILTER_NEUTRAL_STYLE = readablePillStyleFromHex("#64748b");

export function ordineFornitoreStatusLabel(status: OrdineFornitoreStatus): string {
  return STATUS_LABEL[status] ?? status;
}

export function ordineFornitoreStatusPillStyle(status: OrdineFornitoreStatus): CSSProperties {
  return readablePillStyleFromHex(STATUS_HEX[status]);
}

export function ordineFornitoreStatusBadgeClass(status: OrdineFornitoreStatus): string {
  switch (status) {
    case "bozza":
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
    case "inviato":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200";
    case "in_consegna":
      return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200";
    case "consegnato":
      return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200";
    case "annullato":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

function toSelectItem(status: OrdineFornitoreStatus): OrdineFornitoreStatusSelectItem {
  return {
    value: status,
    label: ordineFornitoreStatusLabel(status),
    pillStyle: ordineFornitoreStatusPillStyle(status),
  };
}

export const ORDINE_FORNITORE_STATUS_EDITOR_ITEMS: OrdineFornitoreStatusSelectItem[] =
  ORDINE_FORNITORE_EDITOR_STATUSES.map(toSelectItem);

export const ORDINE_FORNITORE_STATUS_FILTER_ITEMS: OrdineFornitoreStatusSelectItem[] = [
  { value: "", label: "Tutti", pillStyle: ORDINE_FORNITORE_FILTER_NEUTRAL_STYLE },
  ...ORDINE_FORNITORE_ALL_STATUSES.map(toSelectItem),
];

export function ordineFornitoreStatusEditorItems(): OrdineFornitoreStatusSelectItem[] {
  return ORDINE_FORNITORE_STATUS_EDITOR_ITEMS;
}

export function ordineFornitoreStatusFilterItems(): OrdineFornitoreStatusSelectItem[] {
  return ORDINE_FORNITORE_STATUS_FILTER_ITEMS;
}
