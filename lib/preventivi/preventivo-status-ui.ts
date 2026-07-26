import type { CSSProperties } from "react";
import type { PreventivoStato } from "@/lib/preventivi/types";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";

export const PREVENTIVO_STATO_LABELS: Record<PreventivoStato, string> = {
  bozza: "Bozza",
  inviato: "Inviato",
  confermato: "Confermato",
  annullato: "Annullato",
};

const PREVENTIVO_STATO_HEX: Record<PreventivoStato, string> = {
  bozza: "#6b7280",
  inviato: "#2563eb",
  confermato: "#16a34a",
  annullato: "#9ca3af",
};

export function preventivoStatoLabel(stato: PreventivoStato): string {
  return PREVENTIVO_STATO_LABELS[stato] ?? stato;
}

export function preventivoStatoPillStyle(stato: PreventivoStato): CSSProperties {
  return readablePillStyleFromHex(PREVENTIVO_STATO_HEX[stato] ?? "#6b7280");
}

export const PREVENTIVO_STATO_EDITOR_ITEMS = (
  ["bozza", "inviato", "confermato", "annullato"] as const satisfies readonly PreventivoStato[]
).map((value) => ({
  value,
  label: PREVENTIVO_STATO_LABELS[value],
  pillStyle: preventivoStatoPillStyle(value),
}));
