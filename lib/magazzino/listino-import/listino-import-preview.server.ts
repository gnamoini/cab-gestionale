import "server-only";

import { randomUUID } from "node:crypto";
import { mapListinoColumnsWithAi, parseListinoPdfWithAi } from "@/lib/ai/listino-import-analysis";
import { resolveCabAppSettingsResolvedServer } from "@/lib/app-settings/resolve-settings-for-server";
import { getCachedDocumentoBytes } from "@/lib/documents/document-delivery-storage.server";
import { fetchArchiveDocumentFileServer } from "@/lib/documents/document-fetch-server";
import { enrichListinoRowsWithDuplicates } from "@/lib/magazzino/listino-import/listino-import-duplicate-resolver";
import { assignListinoImportCategorie } from "@/lib/magazzino/listino-import/listino-import-categoria.server";
import { fetchGeneratedListinoRicambi } from "@/lib/magazzino/listino-import/listino-import-delete-generated.server";
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

function isListinoImportableFile(fileName: string, contentType?: string): boolean {
  if (/\.(xlsx|xls|csv|pdf)$/i.test(fileName)) return true;
  const mime = (contentType ?? "").toLowerCase();
  if (mime === "application/pdf") return true;
  if (mime.includes("spreadsheet") || mime === "text/csv" || mime === "application/vnd.ms-excel") return true;
  return false;
}

function isListinoPdfFile(fileName: string, contentType?: string): boolean {
  return /\.pdf$/i.test(fileName) || (contentType ?? "").toLowerCase() === "application/pdf";
}

export async function buildListinoImportPreviewFromBytes(input: {
  bytes: Uint8Array;
  fileName: string;
  contentType?: string | null;
  marcaDefault: string;
  documentoNome: string;
  documentoId?: string;
  importFileId?: string;
  userId?: string;
}): Promise<ListinoImportPreviewResult> {
  if (!isListinoImportableFile(input.fileName, input.contentType ?? undefined)) {
    throw new Error("Formato non supportato per import magazzino. Usa Excel, CSV o PDF.");
  }

  const marcaDefault = input.marcaDefault.trim();
  const warnings: string[] = [];
  let parseMethod: ListinoImportParseMethod = "spreadsheet";
  let rawRows: ListinoImportRawRow[] = [];

  if (isListinoPdfFile(input.fileName, input.contentType ?? undefined)) {
    if (input.userId && (await isListinoImportAiRateLimited(input.userId))) {
      throw new Error("Troppe richieste IA. Attendi qualche minuto.");
    }
    parseMethod = "ai_pdf";
    const ai = await parseListinoPdfWithAi(input.bytes, marcaDefault);
    if (!ai.ok) throw new Error(ai.message);
    rawRows = ai.rows;
    warnings.push(...ai.warnings);
  } else {
    const parsed = parseListinoSpreadsheetBuffer(input.bytes, input.fileName);
    warnings.push(...parsed.warnings);
    if (parsed.needsAiColumnMap) {
      if (input.userId && (await isListinoImportAiRateLimited(input.userId))) {
        throw new Error("Troppe richieste IA. Attendi qualche minuto.");
      }
      parseMethod = "ai_columns";
      const matrix = readSpreadsheetMatrix(input.bytes, input.fileName);
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

  const settings = await resolveCabAppSettingsResolvedServer();
  const categorieDisponibili = settings.magazzinoMaster.categorie.length
    ? settings.magazzinoMaster.categorie
    : ["Generale"];

  const { rows: rowsWithCategoria, warnings: categoriaWarnings } = await assignListinoImportCategorie(
    rawRows,
    categorieDisponibili,
    { userId: input.userId },
  );
  warnings.push(...categoriaWarnings);

  const magazzinoIndex = await loadMagazzinoIndex();
  const previewRows = enrichListinoRowsWithDuplicates(rowsWithCategoria, magazzinoIndex);
  const duplicates = previewRows.filter((r) => r.duplicateRicambioId).length;

  return {
    batchId: randomUUID(),
    documentoId: input.documentoId,
    importFileId: input.importFileId,
    documentoNome: input.documentoNome,
    marcaDefault,
    parseMethod,
    categorieDisponibili,
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
  if (!isListinoImportableFile(file.fileName, file.contentType)) {
    throw new Error("Formato non supportato per import magazzino. Usa Excel, CSV o PDF.");
  }

  const bytes = await getCachedDocumentoBytes(file.storagePath);
  if (!bytes) throw new Error("File listino non disponibile nello storage.");

  const marcaDefault = documento.marca?.trim() || "";
  const documentoNome = documentoDisplayName(documento);

  return buildListinoImportPreviewFromBytes({
    bytes,
    fileName: file.fileName,
    contentType: file.contentType,
    marcaDefault,
    documentoNome,
    documentoId,
    userId,
  });
}

export async function countGeneratedListinoRicambi(): Promise<number> {
  const sb = await createSupabaseServerUserClient();
  const rows = await fetchGeneratedListinoRicambi(sb);
  return rows.length;
}
