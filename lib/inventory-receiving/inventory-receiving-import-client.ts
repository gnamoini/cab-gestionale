import type { MatchCandidate } from "@/lib/inventory-receiving/documents/inventory-receiving-types";
import type { InventoryReceivingPendingItem } from "@/lib/inventory-receiving/documents/inventory-receiving-pending-types";
import type { InventoryDocumentLineRow, InventoryDocumentRow } from "@/src/types/supabase-tables";

export type InventoryReceivingAnalyzeResult = {
  document: InventoryDocumentRow;
  lines: InventoryDocumentLineRow[];
  warnings?: string[];
  matches?: MatchCandidate[][];
};

export type InventoryLineDecision = {
  action: "add" | "create" | "skip";
  manualMatchItemId?: string;
  newItemCodice?: string;
  newItemNome?: string;
};

export class InventoryReceivingAnalyzeClientError extends Error {
  readonly code?: string;
  readonly duplicateDocumentId?: string;

  constructor(message: string, code?: string, duplicateDocumentId?: string) {
    super(message);
    this.name = "InventoryReceivingAnalyzeClientError";
    this.code = code;
    this.duplicateDocumentId = duplicateDocumentId;
  }
}

export async function analyzeInventoryReceivingImport(input: {
  importFileId: string;
  skipHashDuplicate?: boolean;
}): Promise<InventoryReceivingAnalyzeResult> {
  const res = await fetch("/api/magazzino/receiving/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => ({}))) as InventoryReceivingAnalyzeResult & {
    error?: string;
    code?: string;
    duplicateDocumentId?: string;
  };
  if (!res.ok) {
    throw new InventoryReceivingAnalyzeClientError(
      data.error ?? "Analisi DDT non riuscita.",
      data.code,
      data.duplicateDocumentId,
    );
  }
  if (!data.document) {
    throw new InventoryReceivingAnalyzeClientError("Risposta analisi incompleta.");
  }
  return {
    document: data.document,
    lines: data.lines ?? [],
    warnings: data.warnings,
    matches: data.matches,
  };
}

export async function abandonInventoryReceivingImport(importFileId: string): Promise<void> {
  const res = await fetch(`/api/import-files/${importFileId}/abandon`, { method: "POST" });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Annullamento import non riuscito.");
}

export async function abandonInventoryReceivingPending(
  item: Pick<InventoryReceivingPendingItem, "kind" | "importFileId" | "documentId">,
): Promise<void> {
  if (item.kind === "document" && item.documentId) {
    const res = await fetch(`/api/magazzino/receiving/${item.documentId}/abandon`, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Annullamento analisi non riuscito.");
    return;
  }
  if (!item.importFileId) throw new Error("Import non trovato.");
  await abandonInventoryReceivingImport(item.importFileId);
}

export async function fetchInventoryReceivingPending(): Promise<InventoryReceivingPendingItem[]> {
  const res = await fetch("/api/magazzino/receiving/pending");
  const data = (await res.json().catch(() => ({}))) as { pending?: InventoryReceivingPendingItem[] };
  if (!res.ok) return [];
  return data.pending ?? [];
}

export async function fetchInventoryReceivingDocument(id: string): Promise<{
  document: InventoryDocumentRow;
  lines: InventoryDocumentLineRow[];
  candidatesByLineId?: Record<string, MatchCandidate[]>;
}> {
  const res = await fetch(`/api/magazzino/receiving/${id}`);
  const data = (await res.json().catch(() => ({}))) as {
    document?: InventoryDocumentRow;
    lines?: InventoryDocumentLineRow[];
    candidatesByLineId?: Record<string, MatchCandidate[]>;
    error?: string;
  };
  if (!res.ok || !data.document) {
    throw new Error(data.error ?? "Documento non trovato.");
  }
  return {
    document: data.document,
    lines: data.lines ?? [],
    candidatesByLineId: data.candidatesByLineId,
  };
}

export async function fetchInventoryReceivingPreviewUrl(id: string): Promise<string | null> {
  const res = await fetch(`/api/magazzino/receiving/${id}/file-url`);
  const data = (await res.json().catch(() => ({}))) as { url?: string };
  return data.url ?? null;
}
