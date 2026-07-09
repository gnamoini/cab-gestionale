import "server-only";

import type { ImportSourceRef } from "@/lib/import-sources/types";
import { resolveImportSource, resolvedImportFileId } from "@/lib/import-sources/resolve-import-source.server";
import { beginImportFileProcessing, completeImportFileProcessing } from "@/lib/import-files/import-file-lifecycle.server";
import type { ImportFileFailedReasonCode } from "@/lib/import-files/import-file-types";
import { resolveCabAppSettingsResolvedServer } from "@/lib/app-settings/resolve-settings-for-server";
import { mapMagazzinoRowsToUI } from "@/lib/magazzino/magazzino-list-cache";
import { OrdineFornitoreImportAnalyzeError } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-analyze-error";
import { buildImportSemanticKey, checkImportDuplicates } from "@/lib/ordini-fornitori/import/check-import-duplicate.server";
import { mapExtractionToOrdineRecord } from "@/lib/ordini-fornitori/import/map-extraction-to-ordine-record";
import { parsePreventivoFornitoreWithAi } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-analysis";
import { isOrdineFornitoreImportAiRateLimited } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-rate-limit.server";
import type { OrdineFornitoreImportAnalyzeResult } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-types";
import { fieldValue } from "@/lib/ordini-fornitori/import/parse-locale-number";
import { MAGAZZINO_RICAMBI_COLUMNS } from "@/lib/db/table-select-columns";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

const IMPORTABLE_MIME = /^application\/pdf$|^image\/(jpeg|png|webp|gif)/i;

function mapAiErrorToReasonCode(code: string | undefined): ImportFileFailedReasonCode {
  if (code === "not_configured") return "UNKNOWN";
  if (code === "timeout") return "TIMEOUT";
  return "AI_PARSE_ERROR";
}

export async function processOrdineFornitoreImport(
  sourceRef: ImportSourceRef,
  userId: string,
  opts?: { skipHashDuplicate?: boolean; skipSemanticDuplicate?: boolean },
): Promise<OrdineFornitoreImportAnalyzeResult> {
  if (await isOrdineFornitoreImportAiRateLimited(userId)) {
    throw new OrdineFornitoreImportAnalyzeError("RATE_LIMITED", "Troppe richieste IA. Attendi qualche minuto.");
  }

  let resolved;
  try {
    resolved = await resolveImportSource(sourceRef, userId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sorgente import non disponibile.";
    const code = message.toLowerCase().includes("documento") ? "DOCUMENT_NOT_FOUND" : "STORAGE_NOT_FOUND";
    throw new OrdineFornitoreImportAnalyzeError(code, message);
  }

  const importFileId = resolvedImportFileId(resolved);

  if (importFileId) {
    try {
      await beginImportFileProcessing(importFileId, userId);
    } catch (e) {
      const code = (e as Error & { code?: string }).code;
      if (code === "PROCESSING_IN_PROGRESS") {
        throw new OrdineFornitoreImportAnalyzeError("ANALYZE_FAILED", "Elaborazione già in corso.");
      }
      throw e;
    }
  }

  const mime = resolved.mime || "application/pdf";
  if (!IMPORTABLE_MIME.test(mime) && !/\.pdf$/i.test(resolved.fileName)) {
    if (importFileId) {
      await completeImportFileProcessing(importFileId, userId, {
        outcome: "failed",
        failedReasonCode: "INVALID_DOCUMENT",
        lastError: { message: "Formato non supportato" },
      }).catch(() => undefined);
    }
    throw new OrdineFornitoreImportAnalyzeError(
      "ANALYZE_FAILED",
      "Formato non supportato. Usa PDF o immagini.",
      { storagePath: resolved.storagePath, bucket: resolved.bucket },
    );
  }

  const contentHash = resolved.contentHash;

  try {
    const ai = await parsePreventivoFornitoreWithAi(resolved.bytes, mime);
    if (!ai.ok) {
      if (importFileId) {
        await completeImportFileProcessing(importFileId, userId, {
          outcome: "failed",
          failedReasonCode: mapAiErrorToReasonCode(ai.code),
          lastError: { message: ai.message, code: ai.code },
        }).catch(() => undefined);
      }
      throw new OrdineFornitoreImportAnalyzeError(
        ai.code === "not_configured" ? "NOT_CONFIGURED" : "AI_GENERATION_FAILED",
        ai.message,
        { storagePath: resolved.storagePath, bucket: resolved.bucket },
      );
    }

    const sb = await createSupabaseServerUserClient();
    const settings = await resolveCabAppSettingsResolvedServer();
    const { data: magRows, error: magErr } = await sb.from("magazzino_ricambi").select(MAGAZZINO_RICAMBI_COLUMNS);
    if (magErr) throw new OrdineFornitoreImportAnalyzeError("ANALYZE_FAILED", magErr.message);

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

    if (importFileId) {
      await completeImportFileProcessing(importFileId, userId, { outcome: "processed" }).catch(() => undefined);
    }

    return mapExtractionToOrdineRecord({
      extraction: ai.extraction,
      magazzinoItems,
      magazzinoMaster: settings.magazzinoMaster,
      existingOrdini: (ordiniRows ?? []).map((o) => ({ numero: o.numero ?? "" })),
      source: sourceRef,
      contentHash,
      semanticKey,
      duplicates,
      aiWarnings: ai.warnings,
    });
  } catch (e) {
    if (importFileId && !(e instanceof OrdineFornitoreImportAnalyzeError)) {
      await completeImportFileProcessing(importFileId, userId, {
        outcome: "failed",
        failedReasonCode: "UNKNOWN",
        lastError: { message: e instanceof Error ? e.message : "Errore sconosciuto" },
      }).catch(() => undefined);
    }
    throw e;
  }
}
