import "server-only";

import { randomUUID } from "node:crypto";
import { mapListinoColumnsWithAi, parseListinoPdfWithAi } from "@/lib/ai/listino-import-analysis";
import { getCachedDocumentoBytes } from "@/lib/documents/document-delivery-storage.server";
import { fetchArchiveDocumentFileServer } from "@/lib/documents/document-fetch-server";
import { enrichListinoRowsWithDuplicates } from "@/lib/magazzino/listino-import/listino-import-duplicate-resolver";
import { readListinoImportFromRicambioMeta } from "@/lib/magazzino/listino-import/listino-import-meta";
import type {
  ListinoImportParseMethod,
  ListinoImportPreviewResult,
  ListinoImportRawRow,
  MagazzinoDuplicateIndexEntry,
} from "@/lib/magazzino/listino-import/listino-import-types";
import { LISTINO_IMPORT_MAX_PREVIEW_ROWS } from "@/lib/magazzino/listino-import/listino-import-types";
import {
  parseListinoSpreadsheetBuffer,
  readSpreadsheetMatrix,
} from "@/lib/magazzino/listino-import/parse-listino-spreadsheet";
import { isListinoImportAiRateLimited } from "@/lib/magazzino/listino-import/listino-import-rate-limit.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { DocumentoRow, MagazzinoRicambioRow } from "@/src/types/supabase-tables";

function isListinoImportableFile(fileName: string): boolean {
  return /\.(xlsx|xls|csv|pdf)$/i.test(fileName);
}

function documentoDisplayName(row: DocumentoRow): string {
  const meta = row.meta ?? {};
  const nome = typeof meta.nome === "string" ? meta.nome.trim() : "";
  return nome || row.url_file.split("/").pop() || "Listino";
}

async function loadMagazzinoIndex(): Promise<MagazzinoDuplicateIndexEntry[]> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.from("magazzino_ricambi").select("id, codice, entity_key, costo, nome, meta");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const r = row as MagazzinoRicambioRow;
    const meta =
      r.meta && typeof r.meta === "object" && !Array.isArray(r.meta)
        ? (r.meta as Record<string, unknown>)
        : null;
    return {
      id: r.id,
      codice: r.codice,
      entityKey: r.entity_key ?? null,
      costo: r.costo ?? null,
      nome: r.nome,
      meta,
      listinoImport: readListinoImportFromRicambioMeta(meta),
    };
  });
}

export async function buildListinoImportPreview(
  documentoId: string,
  userId?: string,
): Promise<ListinoImportPreviewResult> {
  const resolved = await fetchArchiveDocumentFileServer(documentoId);
  if (!resolved.success || !resolved.data) {
    throw new Error(resolved.error ?? "Documento non trovato.");
  }

  const sb = await createSupabaseServerUserClient();
  const { data: docRow, error: docErr } = await sb.from("documenti").select("*").eq("id", documentoId).maybeSingle();
  if (docErr) throw new Error(docErr.message);
  if (!docRow) throw new Error("Documento non trovato.");
  const documento = docRow as DocumentoRow;
  if (documento.categoria !== "listino") {
    throw new Error("Il documento selezionato non è un listino.");
  }

  const file = resolved.data;
  if (!isListinoImportableFile(file.fileName)) {
    throw new Error("Formato non supportato per import magazzino. Usa Excel, CSV o PDF.");
  }

  const bytes = await getCachedDocumentoBytes(file.storagePath);
  if (!bytes) throw new Error("File listino non disponibile nello storage.");

  const marcaDefault = documento.marca?.trim() || "";
  const documentoNome = documentoDisplayName(documento);
  const warnings: string[] = [];
  let parseMethod: ListinoImportParseMethod = "spreadsheet";
  let rawRows: ListinoImportRawRow[] = [];

  if (/\.pdf$/i.test(file.fileName)) {
    if (userId && (await isListinoImportAiRateLimited(userId))) {
      throw new Error("Troppe richieste IA. Attendi qualche minuto.");
    }
    parseMethod = "ai_pdf";
    const ai = await parseListinoPdfWithAi(bytes, marcaDefault);
    if (!ai.ok) throw new Error(ai.message);
    rawRows = ai.rows;
    warnings.push(...ai.warnings);
  } else {
    const parsed = parseListinoSpreadsheetBuffer(bytes, file.fileName);
    warnings.push(...parsed.warnings);
    if (parsed.needsAiColumnMap) {
      if (userId && (await isListinoImportAiRateLimited(userId))) {
        throw new Error("Troppe richieste IA. Attendi qualche minuto.");
      }
      parseMethod = "ai_columns";
      const matrix = readSpreadsheetMatrix(bytes, file.fileName);
      const ai = await mapListinoColumnsWithAi(matrix, marcaDefault);
      if (!ai.ok) throw new Error(ai.message);
      rawRows = ai.rows;
      warnings.push(...ai.warnings);
    } else {
      rawRows = parsed.rows.map((r) => ({ ...r, marca: r.marca || marcaDefault || undefined }));
    }
  }

  const totalParsed = rawRows.length;
  const truncated = totalParsed > LISTINO_IMPORT_MAX_PREVIEW_ROWS;
  if (truncated) {
    rawRows = rawRows.slice(0, LISTINO_IMPORT_MAX_PREVIEW_ROWS);
    warnings.push(`Mostrate le prime ${LISTINO_IMPORT_MAX_PREVIEW_ROWS} righe su ${totalParsed}.`);
  }

  const magazzinoIndex = await loadMagazzinoIndex();
  const previewRows = enrichListinoRowsWithDuplicates(rawRows, magazzinoIndex);
  const duplicates = previewRows.filter((r) => r.duplicateRicambioId).length;

  return {
    batchId: randomUUID(),
    documentoId,
    documentoNome,
    marcaDefault,
    parseMethod,
    rows: previewRows,
    stats: {
      totalParsed,
      duplicates,
      invalid: Math.max(0, totalParsed - previewRows.length),
      truncated,
    },
    warnings,
  };
}

export async function countGeneratedListinoRicambi(): Promise<number> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.from("magazzino_ricambi").select("id, meta");
  if (error) throw new Error(error.message);
  let count = 0;
  for (const row of data ?? []) {
    if (readListinoImportFromRicambioMeta((row as { meta?: unknown }).meta)) count += 1;
  }
  return count;
}
