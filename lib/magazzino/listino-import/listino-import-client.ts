/**
 * @deprecated Import listino da documento PDF — flusso legacy Documenti.
 * Per import tabellare listino ricambi usare il wizard generico (`listino_ricambi` → `/api/import/listino/*`).
 */
import type {
  ListinoImportDecision,
  ListinoImportExecuteResult,
  ListinoImportPreviewResult,
} from "@/lib/magazzino/listino-import/listino-import-types";

export function isListinoImportSupportedFileName(fileName: string): boolean {
  return /\.(xlsx|xls|csv|pdf)$/i.test(fileName.trim());
}

export async function fetchListinoImportPreview(documentoId: string): Promise<ListinoImportPreviewResult> {
  const res = await fetch("/api/magazzino/listino-import/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ documentoId }),
  });
  const json = (await res.json()) as ListinoImportPreviewResult & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Anteprima import non riuscita.");
  return json;
}

export async function executeListinoImportRequest(input: {
  documentoId: string;
  batchId: string;
  decisions: ListinoImportDecision[];
}): Promise<ListinoImportExecuteResult> {
  const res = await fetch("/api/magazzino/listino-import/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ListinoImportExecuteResult & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Import listino non riuscito.");
  return json;
}

export async function fetchGeneratedListinoRicambiCount(): Promise<number> {
  const res = await fetch("/api/magazzino/listino-import/generated", { credentials: "include" });
  const json = (await res.json()) as { count?: number; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Conteggio non riuscito.");
  return json.count ?? 0;
}

export async function deleteGeneratedListinoRicambiRequest(): Promise<{
  deleted: number;
  blocked: Array<{ id: string; codice: string; reason: string }>;
}> {
  const res = await fetch("/api/magazzino/listino-import/generated", {
    method: "DELETE",
    credentials: "include",
  });
  const json = (await res.json()) as {
    deleted?: number;
    blocked?: Array<{ id: string; codice: string; reason: string }>;
    error?: string;
  };
  if (!res.ok) throw new Error(json.error ?? "Eliminazione non riuscita.");
  return { deleted: json.deleted ?? 0, blocked: json.blocked ?? [] };
}
