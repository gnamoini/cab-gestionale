import type { ImportSourceRef } from "@/lib/import-sources/types";
import type { OrdineFornitoreImportAnalyzeResult } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-types";

export async function analyzeOrdineFornitoreImport(input: {
  source?: ImportSourceRef;
  importFileId?: string;
  documentoId?: string;
  skipHashDuplicate?: boolean;
  skipSemanticDuplicate?: boolean;
}): Promise<OrdineFornitoreImportAnalyzeResult> {
  const body: Record<string, unknown> = {
    skipHashDuplicate: input.skipHashDuplicate,
    skipSemanticDuplicate: input.skipSemanticDuplicate,
  };
  if (input.source) body.source = input.source;
  else if (input.importFileId) body.importFileId = input.importFileId;
  else if (input.documentoId) body.documentoId = input.documentoId;

  const res = await fetch("/api/ordini-fornitori/import/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as OrdineFornitoreImportAnalyzeResult & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Analisi import non riuscita.");
  return data;
}

export async function abandonImportFile(importFileId: string): Promise<void> {
  const res = await fetch(`/api/import-files/${importFileId}/abandon`, { method: "POST" });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Annullamento import non riuscito.");
}

export async function finalizeOrdineFornitoreImportClient(input: {
  source: ImportSourceRef;
  ordineId: string;
  contentHash: string;
  semanticKey?: string | null;
}): Promise<void> {
  const res = await fetch("/api/ordini-fornitori/import/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Finalizzazione import non riuscita.");
}
