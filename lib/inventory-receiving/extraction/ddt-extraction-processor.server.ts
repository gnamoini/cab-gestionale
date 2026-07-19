import "server-only";

import { getCompanyIdForUserOrNull } from "@/lib/document-capture/company-id.server";
import {
  INVENTORY_DOCUMENT_LINES_COLUMNS,
  INVENTORY_DOCUMENTS_COLUMNS,
  MAGAZZINO_RICAMBI_COLUMNS,
} from "@/lib/db/table-select-columns";
import {
  checkDdtDuplicateByHash,
  checkDdtDuplicateBySemantic,
} from "@/lib/inventory-receiving/check-ddt-duplicate.server";
import {
  computeDocumentAiConfidence,
  mapItemQuantities,
} from "@/lib/inventory-receiving/extraction/compute-document-confidence";
import { parseDdtWithAi } from "@/lib/inventory-receiving/extraction/ddt-extraction-analysis";
import { matchInventoryLines } from "@/lib/inventory-receiving/matching/inventory-matching-engine";
import { lookupFornitoreByPivaCfName } from "@/lib/ordini-fornitori/import/lookup-fornitore.server";
import { resolveCabAppSettingsResolvedServer } from "@/lib/app-settings/resolve-settings-for-server";
import { mapMagazzinoRowsToUI } from "@/lib/magazzino/magazzino-list-cache";
import { resolveImportSource, resolvedImportFileId } from "@/lib/import-sources/resolve-import-source.server";
import { beginImportFileProcessing, completeImportFileProcessing } from "@/lib/import-files/import-file-lifecycle.server";
import { recordImportFileResult } from "@/lib/import-files/import-file-results.server";
import { traceInventoryReceivingOperation } from "@/lib/inventory-receiving/observability/inventory-receiving-telemetry.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import { auditContext, writeModificaLog } from "@/src/services/internal/audit-log";
import type { MatchCandidate } from "@/lib/inventory-receiving/documents/inventory-receiving-types";

const IMPORTABLE_MIME = /^application\/pdf$|^image\/(jpeg|png|webp|gif)/i;

export class DdtReceivingAnalyzeError extends Error {
  readonly code: string;
  readonly duplicateDocumentId?: string;

  constructor(code: string, message: string, duplicateDocumentId?: string) {
    super(message);
    this.name = "DdtReceivingAnalyzeError";
    this.code = code;
    this.duplicateDocumentId = duplicateDocumentId;
  }
}

export async function processDdtReceivingAnalyze(importFileId: string, userId: string, opts?: { skipHashDuplicate?: boolean }) {
  const startedAt = Date.now();
  let resolved;
  try {
    resolved = await resolveImportSource({ type: "import_file", id: importFileId }, userId);
  } catch (e) {
    throw new DdtReceivingAnalyzeError("STORAGE_NOT_FOUND", e instanceof Error ? e.message : "Sorgente non disponibile");
  }

  const fileId = resolvedImportFileId(resolved);
  if (fileId) {
    await beginImportFileProcessing(fileId, userId).catch((e) => {
      if ((e as Error & { code?: string }).code === "PROCESSING_IN_PROGRESS") {
        throw new DdtReceivingAnalyzeError("ANALYZE_FAILED", "Elaborazione già in corso.");
      }
      throw e;
    });
  }

  const mime = resolved.mime || "application/pdf";
  if (!IMPORTABLE_MIME.test(mime) && !/\.pdf$/i.test(resolved.fileName)) {
    if (fileId) {
      await completeImportFileProcessing(fileId, userId, {
        outcome: "failed",
        failedReasonCode: "INVALID_DOCUMENT",
        lastError: { message: "Formato non supportato" },
      }).catch(() => undefined);
    }
    throw new DdtReceivingAnalyzeError("ANALYZE_FAILED", "Formato non supportato. Usa PDF o immagini.");
  }

  const companyId = await getCompanyIdForUserOrNull();
  if (!companyId) throw new DdtReceivingAnalyzeError("TENANT_MISSING", "Tenant non configurato");

  const sb = await createSupabaseServerUserClient();

  if (!opts?.skipHashDuplicate && resolved.contentHash) {
    const dup = await checkDdtDuplicateByHash(sb, companyId, resolved.contentHash);
    if (dup) {
      throw new DdtReceivingAnalyzeError(
        "DUPLICATE_HASH",
        `DDT già caricato (${dup.documentNumber ?? dup.documentId})`,
        dup.documentId,
      );
    }
  }

  const { data: docRow, error: docInsErr } = await sb
    .from("inventory_documents")
    .insert({
      company_id: companyId,
      import_file_id: fileId,
      file_path: resolved.storagePath,
      content_hash: resolved.contentHash,
      status: "ANALYZING",
      created_by: userId,
    })
    .select(INVENTORY_DOCUMENTS_COLUMNS)
    .single();

  if (docInsErr || !docRow) {
    throw new DdtReceivingAnalyzeError("ANALYZE_FAILED", docInsErr?.message ?? "Creazione documento fallita");
  }

  try {
    const ai = await parseDdtWithAi(resolved.bytes, mime);
    if (!ai.ok) {
      await sb.from("inventory_documents").update({ status: "FAILED" }).eq("id", docRow.id);
      throw new DdtReceivingAnalyzeError(ai.code === "not_configured" ? "NOT_CONFIGURED" : "AI_FAILED", ai.message);
    }

    const extraction = ai.extraction;
    const supplierLabel =
      extraction.supplier?.ragioneSociale?.trim() ||
      lookupFornitoreByPivaCfName(
        {
          partitaIva: extraction.supplier?.partitaIva,
          ragioneSociale: extraction.supplier?.ragioneSociale,
        },
        (await resolveCabAppSettingsResolvedServer()).magazzinoMaster,
      ).label ||
      null;

    if (!opts?.skipHashDuplicate) {
      const semDup = await checkDdtDuplicateBySemantic(sb, companyId, {
        supplierLabel: supplierLabel ?? undefined,
        documentNumber: extraction.document_number,
        documentDate: extraction.date,
      });
      if (semDup && semDup.documentId !== docRow.id) {
        await sb.from("inventory_documents").update({ status: "FAILED" }).eq("id", docRow.id);
        throw new DdtReceivingAnalyzeError(
          "DUPLICATE_SEMANTIC",
          `DDT duplicato (${semDup.documentNumber})`,
          semDup.documentId,
        );
      }
    }

    const documentAiConfidence = computeDocumentAiConfidence(extraction);

    const { data: magRows } = await sb.from("magazzino_ricambi").select(MAGAZZINO_RICAMBI_COLUMNS);
    const catalog = mapMagazzinoRowsToUI((magRows ?? []) as MagazzinoRicambioRow[], "Receiving");

    const lineInputs = extraction.items.map((item) => {
      const qty = mapItemQuantities(item);
      return {
        rawCode: item.code?.trim() ?? "",
        description: item.description?.trim() ?? "",
        extractedQuantity: qty.extractedQuantity,
        receivedQuantity: qty.receivedQuantity,
        unit: item.unit?.trim() ?? null,
        lineAiConfidence: item.confidence ?? null,
      };
    });

    const matches = matchInventoryLines(
      catalog,
      lineInputs.map((l) => ({ rawCode: l.rawCode, description: l.description, supplierLabel: supplierLabel ?? "" })),
      supplierLabel ?? "",
    );

    const lineRows = lineInputs.map((line, index) => {
      const match = matches[index]!;
      return {
        document_id: docRow.id,
        line_index: index,
        raw_code: line.rawCode || null,
        extracted_description: line.description,
        extracted_quantity: line.extractedQuantity,
        received_quantity: line.receivedQuantity,
        unit: line.unit,
        matched_item_id: match.matchedItemId,
        match_confidence: match.matchConfidence,
        match_status: match.matchStatus,
        line_ai_confidence: line.lineAiConfidence,
        apply_status: "pending" as const,
      };
    });

    if (lineRows.length) {
      const { error: linesErr } = await sb.from("inventory_document_lines").insert(lineRows);
      if (linesErr) throw new DdtReceivingAnalyzeError("ANALYZE_FAILED", linesErr.message);
    }

    const { data: updated, error: updErr } = await sb
      .from("inventory_documents")
      .update({
        supplier_label: supplierLabel,
        document_number: extraction.document_number?.trim() || null,
        document_date: extraction.date?.trim().slice(0, 10) || null,
        document_ai_confidence: documentAiConfidence,
        status: "REVIEW_REQUIRED",
      })
      .eq("id", docRow.id)
      .select(INVENTORY_DOCUMENTS_COLUMNS)
      .single();

    if (updErr || !updated) throw new DdtReceivingAnalyzeError("ANALYZE_FAILED", updErr?.message ?? "Aggiornamento fallito");

    if (fileId) {
      await completeImportFileProcessing(fileId, userId, { outcome: "processed" }).catch(() => undefined);
      await recordImportFileResult({
        importFileId: fileId,
        entityType: "inventory_documents",
        entityId: updated.id,
        meta: {
          documentNumber: updated.document_number,
          lineCount: lineRows.length,
          documentAiConfidence,
        },
      }).catch(() => undefined);
    }

    const matchedCount = matches.filter((m) => m.matchedItemId).length;
    const newItemCount = matches.filter((m) => m.matchStatus === "NEW_ITEM").length;
    await writeModificaLog(sb, {
      entita: "inventory_documents",
      entita_id: updated.id,
      azione: "UPDATE",
      payload: auditContext(
        `AI_ANALYSIS_COMPLETED — confidence ${Math.round(documentAiConfidence * 100)}% — ${lineRows.length} righe — ${matchedCount} match — ${newItemCount} nuovi`,
      ),
    });

    traceInventoryReceivingOperation({
      operation: "analyze_complete",
      documentId: updated.id,
      importFileId: fileId ?? undefined,
      durationMs: Date.now() - startedAt,
      meta: {
        lines: lineRows.length,
        matched: matchedCount,
        newItems: newItemCount,
        confidence: documentAiConfidence,
      },
    });

    const { data: lines } = await sb
      .from("inventory_document_lines")
      .select(INVENTORY_DOCUMENT_LINES_COLUMNS)
      .eq("document_id", docRow.id)
      .order("line_index");

    return {
      document: updated,
      lines: lines ?? [],
      warnings: ai.warnings,
      matches: matches.map((m) => m.candidates),
    };
  } catch (e) {
    if (!(e instanceof DdtReceivingAnalyzeError)) {
      await sb.from("inventory_documents").update({ status: "FAILED" }).eq("id", docRow.id);
    }
    if (fileId) {
      await completeImportFileProcessing(fileId, userId, {
        outcome: "failed",
        failedReasonCode: "AI_PARSE_ERROR",
        lastError: { message: e instanceof Error ? e.message : "Errore" },
      }).catch(() => undefined);
    }
    throw e;
  }
}

export async function confirmDdtReceivingReview(
  documentId: string,
  decisions: Array<{
    lineId: string;
    action: "add" | "create" | "skip";
    receivedQuantity: number;
    finalItemId?: string;
    manualMatchItemId?: string;
    newItem?: { codice: string; nome: string; marca?: string; categoria?: string; unitaMisura?: string };
  }>,
) {
  const sb = await createSupabaseServerUserClient();

  for (const d of decisions) {
    const itemId = d.manualMatchItemId ?? d.finalItemId ?? null;
    await sb
      .from("inventory_document_lines")
      .update({
        user_action: d.action,
        received_quantity: d.receivedQuantity,
        final_quantity: d.action === "skip" ? null : d.receivedQuantity,
        final_item_id: d.action === "add" ? itemId : null,
        matched_item_id: d.action === "add" ? itemId : null,
        match_status: d.manualMatchItemId ? "FOUND" : undefined,
      })
      .eq("id", d.lineId)
      .eq("document_id", documentId);
  }

  await sb.from("inventory_documents").update({ status: "READY_TO_APPLY" }).eq("id", documentId);

  const { data: doc } = await sb
    .from("inventory_documents")
    .select(INVENTORY_DOCUMENTS_COLUMNS)
    .eq("id", documentId)
    .single();

  const { data: lines } = await sb
    .from("inventory_document_lines")
    .select(INVENTORY_DOCUMENT_LINES_COLUMNS)
    .eq("document_id", documentId)
    .order("line_index");

  return { document: doc, lines: lines ?? [] };
}

export async function fetchInventoryReceivingDocument(documentId: string, opts?: { includeCandidates?: boolean }) {
  const sb = await createSupabaseServerUserClient();
  const { data: doc, error } = await sb
    .from("inventory_documents")
    .select(INVENTORY_DOCUMENTS_COLUMNS)
    .eq("id", documentId)
    .maybeSingle();
  if (error || !doc) return null;

  const { data: lines } = await sb
    .from("inventory_document_lines")
    .select(INVENTORY_DOCUMENT_LINES_COLUMNS)
    .eq("document_id", documentId)
    .order("line_index");

  const lineRows = lines ?? [];
  let candidatesByLineId: Record<string, MatchCandidate[]> | undefined;

  if (opts?.includeCandidates && lineRows.length > 0) {
    const { data: magRows } = await sb.from("magazzino_ricambi").select(MAGAZZINO_RICAMBI_COLUMNS);
    const catalog = mapMagazzinoRowsToUI((magRows ?? []) as MagazzinoRicambioRow[], "Receiving");
    const matches = matchInventoryLines(
      catalog,
      lineRows.map((l) => ({
        rawCode: l.raw_code?.trim() ?? "",
        description: l.extracted_description,
        supplierLabel: doc.supplier_label ?? "",
      })),
      doc.supplier_label ?? "",
    );
    candidatesByLineId = {};
    lineRows.forEach((line, index) => {
      candidatesByLineId![line.id] = matches[index]?.candidates ?? [];
    });
  }

  return { document: doc, lines: lineRows, candidatesByLineId };
}
