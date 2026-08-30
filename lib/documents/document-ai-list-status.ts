import type { DocumentoGestionale } from "@/lib/types/gestionale";

/** Stato sintetico Ricambi AI per righe lista documenti. */
export type DocumentAiListStatus = "off" | "inactive" | "pending" | "processing" | "ready" | "failed";

export type DocumentAiIndexRow = {
  status?: string | null;
  understandingStatus?: string | null;
};

export function documentoRicambiAiCandidate(doc: Pick<DocumentoGestionale, "tipoFile" | "categoria">): boolean {
  return (
    doc.tipoFile === "pdf" &&
    (doc.categoria === "listini" || doc.categoria === "cataloghi" || doc.categoria === "manuali")
  );
}

export function deriveDocumentAiListStatus(input: {
  aiEnabled: boolean;
  isCandidate?: boolean;
  index?: DocumentAiIndexRow | null;
}): DocumentAiListStatus {
  if (!input.aiEnabled) {
    return input.isCandidate ? "inactive" : "off";
  }

  const fs = input.index?.status ?? "none";
  const us = input.index?.understandingStatus ?? "none";

  if (fs === "failed" || us === "failed") return "failed";
  if (fs === "indexed" && (us === "ready" || us === "ready_with_warnings")) return "ready";
  if (fs === "none" && us === "none") return "pending";
  if (fs === "pending" && us === "pending") return "pending";
  return "processing";
}

export function documentAiListStatusLabel(status: DocumentAiListStatus): string {
  if (status === "inactive") return "Non in Ricambi AI";
  if (status === "pending") return "In coda";
  if (status === "processing") return "Indicizzazione…";
  if (status === "ready") return "Indicizzato";
  if (status === "failed") return "Errore";
  return "";
}

export function documentAiListStatusTooltip(
  status: DocumentAiListStatus,
  input?: { fileSearch?: string; aiCatalog?: string },
): string {
  if (status === "inactive") {
    return "Questo PDF non è abilitato per Identifica ricambio. Apri Dettagli → Modifica per attivarlo.";
  }
  if (status === "pending") {
    return "Ricambi AI attivo: indicizzazione in attesa di avvio.";
  }
  if (status === "processing") {
    const parts: string[] = ["Ricambi AI attivo: indicizzazione in corso."];
    if (input?.fileSearch === "processing") parts.push("File Search in elaborazione.");
    if (input?.aiCatalog === "processing") parts.push("Analisi catalogo in elaborazione.");
    return parts.join(" ");
  }
  if (status === "ready") {
    return "Indicizzato e utilizzabile in Identifica ricambio.";
  }
  if (status === "failed") {
    return "Indicizzazione fallita. Apri Dettagli per lo stato completo e riprova dal salvataggio.";
  }
  return "";
}

export function documentAiListStatusBadgeClass(status: DocumentAiListStatus): string {
  if (status === "ready") {
    return "bg-[color:color-mix(in_srgb,var(--cab-success)_18%,var(--cab-surface))] text-[color:var(--cab-text)] ring-[color:color-mix(in_srgb,var(--cab-success)_45%,var(--cab-border))]";
  }
  if (status === "processing" || status === "pending") {
    return "bg-[color:color-mix(in_srgb,var(--cab-warning)_20%,var(--cab-surface))] text-[color:var(--cab-text)] ring-[color:color-mix(in_srgb,var(--cab-warning)_48%,var(--cab-border))]";
  }
  if (status === "failed") {
    return "bg-[color:color-mix(in_srgb,var(--cab-danger)_14%,var(--cab-surface))] text-[color:var(--cab-danger)] ring-[color:color-mix(in_srgb,var(--cab-danger)_40%,var(--cab-border))]";
  }
  if (status === "inactive") {
    return "bg-[color:color-mix(in_srgb,var(--cab-text-muted)_10%,var(--cab-surface))] text-[color:var(--cab-text-muted)] ring-[color:var(--cab-border)]";
  }
  return "";
}

export function documentAiListStatusGlyph(status: DocumentAiListStatus): string {
  if (status === "ready") return "✓";
  if (status === "processing") return "…";
  if (status === "pending") return "○";
  if (status === "failed") return "✗";
  if (status === "inactive") return "—";
  return "";
}
