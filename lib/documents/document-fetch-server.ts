import "server-only";

import { documentoStoragePathFromStored } from "@/lib/documenti/storage-path-from-stored";
import { readDocumentIntelligenceMeta } from "@/lib/documents/document-meta";
import { mimeTypeFromFileName } from "@/lib/documents/document-mime";
import type { DocumentDeliverySource, ResolvedDocumentFile } from "@/lib/documents/document-delivery-types";
import { DOCUMENTI_COLUMNS, LAVORAZIONE_DOCUMENTS_COLUMNS } from "@/lib/db/table-select-columns";
import { verifyDocumentDeliveryAccess } from "@/lib/documents/document-delivery-auth.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { DocumentoRow, LavorazioneDocumentRow, LavorazioneDocumentTipo } from "@/src/types/supabase-tables";

export async function fetchArchiveDocumentFileServer(id: string): Promise<ServiceResult<ResolvedDocumentFile>> {
  const allowed = await verifyDocumentDeliveryAccess("archive");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.from("documenti").select(DOCUMENTI_COLUMNS).eq("id", id).maybeSingle();
  if (error) return err(error.message);
  if (!data) return err("Documento non trovato");
  const row = data as DocumentoRow;
  const meta = row.meta ?? {};
  const nome =
    typeof meta.nome === "string" && meta.nome.trim() ? meta.nome.trim() : row.url_file.split("/").pop() ?? "documento";
  const path = documentoStoragePathFromStored(row.url_file);
  if (!path) return err("Percorso file non valido o URL legacy non supportato.");
  const intelligence = readDocumentIntelligenceMeta(meta as Record<string, unknown>);
  const contentVersion =
    (typeof meta.uploadedAt === "string" && meta.uploadedAt) || row.created_at || new Date(0).toISOString();
  return success({
    source: "archive",
    storagePath: path,
    fileName: nome,
    contentType: mimeTypeFromFileName(nome),
    contentVersion,
    contentHash: intelligence.contentHash,
    documentRowId: row.id,
  });
}

export async function fetchLavorazioneDocumentFileServer(
  lavorazioneId: string,
  tipo: LavorazioneDocumentTipo,
): Promise<ServiceResult<ResolvedDocumentFile>> {
  const allowed = await verifyDocumentDeliveryAccess("lavorazione");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("lavorazione_documents")
    .select(LAVORAZIONE_DOCUMENTS_COLUMNS)
    .eq("lavorazione_id", lavorazioneId)
    .eq("tipo", tipo)
    .maybeSingle();
  if (error) return err(error.message);
  if (!data) return err("Documento non trovato");
  const row = data as LavorazioneDocumentRow;
  return success({
    source: "lavorazione",
    storagePath: row.storage_path,
    fileName: row.filename,
    contentType: mimeTypeFromFileName(row.filename),
    contentVersion: row.uploaded_at,
  });
}

export async function resolveDocumentFileServer(input: {
  id: string;
  source: DocumentDeliverySource;
  tipo?: LavorazioneDocumentTipo;
}): Promise<ServiceResult<ResolvedDocumentFile>> {
  if (input.source === "archive") return fetchArchiveDocumentFileServer(input.id);
  const tipo = input.tipo;
  if (!tipo) return err("Parametro tipo mancante per documento lavorazione.");
  return fetchLavorazioneDocumentFileServer(input.id, tipo);
}
