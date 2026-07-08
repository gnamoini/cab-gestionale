import "server-only";

import { randomUUID } from "node:crypto";
import { resolveCabAppSettingsResolvedServer } from "@/lib/app-settings/resolve-settings-for-server";
import { fetchArchiveDocumentFileServer } from "@/lib/documents/document-fetch-server";
import { getCachedDocumentoBytes } from "@/lib/documents/document-delivery-storage.server";
import { readDocumentIntelligenceMeta } from "@/lib/documents/document-meta";
import { mapMagazzinoRowsToUI } from "@/lib/magazzino/magazzino-list-cache";
import { buildImportSemanticKey, checkImportDuplicates } from "@/lib/ordini-fornitori/import/check-import-duplicate.server";
import { mapExtractionToOrdineRecord } from "@/lib/ordini-fornitori/import/map-extraction-to-ordine-record";
import { parsePreventivoFornitoreWithAi } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-analysis";
import { isOrdineFornitoreImportAiRateLimited } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-rate-limit.server";
import type { OrdineFornitoreImportAnalyzeResult } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-types";
import {
  fieldValue,
} from "@/lib/ordini-fornitori/import/parse-locale-number";
import { MAGAZZINO_RICAMBI_COLUMNS } from "@/lib/db/table-select-columns";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { DocumentoRow, MagazzinoRicambioRow } from "@/src/types/supabase-tables";

const IMPORTABLE_MIME = /^application\/pdf$|^image\/(jpeg|png|webp|gif)/i;

export async function markDocumentoPendingImport(
  documentoId: string,
  sessionId = randomUUID(),
): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { data: row } = await sb.from("documenti").select("meta").eq("id", documentoId).maybeSingle();
  const meta = (row?.meta && typeof row.meta === "object" ? row.meta : {}) as Record<string, unknown>;
  await sb
    .from("documenti")
    .update({
      meta: {
        ...meta,
        importStatus: "pending_import",
        importSessionId: sessionId,
      },
    })
    .eq("id", documentoId);
}

export async function buildOrdineFornitoreImportAnalyze(
  documentoId: string,
  userId: string,
  opts?: { skipHashDuplicate?: boolean; skipSemanticDuplicate?: boolean },
): Promise<OrdineFornitoreImportAnalyzeResult> {
  if (await isOrdineFornitoreImportAiRateLimited(userId)) {
    throw new Error("Troppe richieste IA. Attendi qualche minuto.");
  }

  const resolved = await fetchArchiveDocumentFileServer(documentoId);
  if (!resolved.success || !resolved.data) {
    throw new Error(resolved.error ?? "Documento non trovato.");
  }

  const sb = await createSupabaseServerUserClient();
  const { data: docRow, error: docErr } = await sb.from("documenti").select("*").eq("id", documentoId).maybeSingle();
  if (docErr) throw new Error(docErr.message);
  if (!docRow) throw new Error("Documento non trovato.");
  const documento = docRow as DocumentoRow;

  const file = resolved.data;
  const mime = file.contentType || "application/pdf";
  if (!IMPORTABLE_MIME.test(mime) && !/\.pdf$/i.test(file.fileName)) {
    throw new Error("Formato non supportato. Usa PDF o immagini.");
  }

  const bytes = await getCachedDocumentoBytes(file.storagePath);
  if (!bytes) throw new Error("File non disponibile nello storage.");

  const intelligence = readDocumentIntelligenceMeta((documento.meta ?? {}) as Record<string, unknown>);
  const contentHash = intelligence.contentHash ?? file.contentHash ?? "";

  await markDocumentoPendingImport(documentoId);

  const ai = await parsePreventivoFornitoreWithAi(bytes, mime);
  if (!ai.ok) throw new Error(ai.message);

  const settings = await resolveCabAppSettingsResolvedServer();
  const { data: magRows, error: magErr } = await sb.from("magazzino_ricambi").select(MAGAZZINO_RICAMBI_COLUMNS);
  if (magErr) throw new Error(magErr.message);

  const magazzinoItems = mapMagazzinoRowsToUI((magRows ?? []) as MagazzinoRicambioRow[], "Import");

  const partitaIva = fieldValue(ai.extraction.fornitore?.partitaIva);
  const numero = fieldValue(ai.extraction.documento?.numeroPreventivo);
  const data = fieldValue(ai.extraction.documento?.data);
  const semanticKey = buildImportSemanticKey({
    partitaIva,
    numeroPreventivo: numero,
    dataPreventivo: data,
  });

  const duplicates = await checkImportDuplicates(sb, { contentHash, semanticKey });
  if (opts?.skipHashDuplicate && duplicates.hashDuplicate) duplicates.hashDuplicate = null;
  if (opts?.skipSemanticDuplicate && duplicates.semanticDuplicate) duplicates.semanticDuplicate = null;

  const { data: ordiniRows } = await sb.from("ordini_fornitori").select("numero").neq("status", "annullato");

  return mapExtractionToOrdineRecord({
    extraction: ai.extraction,
    magazzinoItems,
    magazzinoMaster: settings.magazzinoMaster,
    existingOrdini: (ordiniRows ?? []).map((o) => ({ numero: o.numero ?? "" })),
    documentoId,
    contentHash,
    semanticKey,
    duplicates,
    aiWarnings: ai.warnings,
  });
}
