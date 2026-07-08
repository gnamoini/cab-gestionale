import type { OrdineFornitoreImportAnalyzeResult } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-types";

export async function analyzeOrdineFornitoreImport(input: {
  documentoId: string;
  skipHashDuplicate?: boolean;
  skipSemanticDuplicate?: boolean;
}): Promise<OrdineFornitoreImportAnalyzeResult> {
  const res = await fetch("/api/ordini-fornitori/import/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => ({}))) as OrdineFornitoreImportAnalyzeResult & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Analisi import non riuscita.");
  return data;
}

export async function finalizeOrdineFornitoreImportDocument(input: {
  documentoId: string;
  action: "link" | "unlink";
  ordineId?: string;
  contentHash?: string;
  semanticKey?: string | null;
}): Promise<void> {
  const res = await fetch("/api/ordini-fornitori/import/finalize-document", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Finalizzazione documento non riuscita.");
}
