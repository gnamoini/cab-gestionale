import type { CSSProperties } from "react";
import type { PreventivoMetodoAccettazione, PreventivoStatoCliente, PreventivoStatoWorkflow } from "@/lib/preventivi/types";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";

export const PREVENTIVO_WORKFLOW_LABELS: Record<PreventivoStatoWorkflow, string> = {
  bozza: "Bozza",
  inviato: "Inviato",
  acquisito: "Acquisito",
  annullato: "Annullato",
};

export const PREVENTIVO_CLIENTE_LABELS: Record<PreventivoStatoCliente, string> = {
  pending: "In attesa",
  accettato: "Accettato",
  rifiutato: "Rifiutato",
};

const WORKFLOW_HEX: Record<PreventivoStatoWorkflow, string> = {
  bozza: "#6b7280",
  inviato: "#2563eb",
  acquisito: "#16a34a",
  annullato: "#dc2626",
};

const CLIENTE_HEX: Record<PreventivoStatoCliente, string> = {
  pending: "#ca8a04",
  accettato: "#16a34a",
  rifiutato: "#dc2626",
};

export function preventivoWorkflowLabel(stato: PreventivoStatoWorkflow): string {
  return PREVENTIVO_WORKFLOW_LABELS[stato] ?? stato;
}

export function preventivoClienteLabel(stato: PreventivoStatoCliente | null): string {
  if (!stato) return "—";
  return PREVENTIVO_CLIENTE_LABELS[stato] ?? stato;
}

export function preventivoWorkflowPillStyle(stato: PreventivoStatoWorkflow): CSSProperties {
  return readablePillStyleFromHex(WORKFLOW_HEX[stato] ?? "#6b7280");
}

export function preventivoClientePillStyle(stato: PreventivoStatoCliente | null): CSSProperties {
  if (!stato) return readablePillStyleFromHex("#6b7280");
  return readablePillStyleFromHex(CLIENTE_HEX[stato] ?? "#6b7280");
}

export function preventivoClienteDisplayLabel(
  stato: PreventivoStatoCliente | null,
  metodo?: PreventivoMetodoAccettazione | null,
): string {
  if (stato === "accettato" && metodo === "timeout_automatico") {
    return "Accettato automaticamente per mancata risposta entro 24 ore";
  }
  return preventivoClienteLabel(stato);
}

/** @deprecated */
export const PREVENTIVO_STATO_LABELS: Record<string, string> = {
  ...PREVENTIVO_WORKFLOW_LABELS,
  confermato: "Acquisito",
};

/** @deprecated */
export function preventivoStatoLabel(stato: string): string {
  return PREVENTIVO_STATO_LABELS[stato] ?? stato;
}

/** @deprecated */
export function preventivoStatoPillStyle(stato: string): CSSProperties {
  if (stato in WORKFLOW_HEX) return preventivoWorkflowPillStyle(stato as PreventivoStatoWorkflow);
  if (stato === "confermato") return preventivoWorkflowPillStyle("acquisito");
  return readablePillStyleFromHex("#6b7280");
}

export function preventivoStatoHeaderPillClass(): string {
  return "relative inline-flex shrink-0 items-center overflow-hidden rounded-full border border-black/10 px-2.5 py-1 text-[10px] font-semibold uppercase leading-none tracking-wide shadow-sm shadow-black/10 transition-[filter,box-shadow] duration-200 dark:border-white/15";
}

export const PREVENTIVO_STATO_EDITOR_ITEMS = (
  ["bozza", "inviato", "annullato"] as const satisfies readonly PreventivoStatoWorkflow[]
).map((value) => ({
  value,
  label: PREVENTIVO_WORKFLOW_LABELS[value],
  pillStyle: preventivoWorkflowPillStyle(value),
}));
