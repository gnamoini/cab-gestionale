import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildExtractedPartPrice } from "@/lib/ai/spare-parts/understanding/extracted-part-price";
import { evaluateExtractionQuality } from "@/lib/ai/spare-parts/understanding/extraction-quality-gate.server";
import { oemTripleFromRaw, pickBestOemRaw } from "@/lib/ai/spare-parts/retrieval/oem-code-normalize";
import type { PriceEvidence } from "@/lib/ai/spare-parts/types/schemas";

const BATCH_SIZE = 200;

export type PartReferenceInsertRow = {
  index_id: string;
  page_id: string;
  exploded_view_id?: string | null;
  position_number?: string | null;
  part_number_candidate?: string | null;
  part_number_verified?: string | null;
  part_number_raw?: string | null;
  part_number_normalized?: string | null;
  part_number_search?: string | null;
  description?: string | null;
  quantity?: string | null;
  source: string;
  price_candidate?: PriceEvidence | null;
};

export async function clearDocumentUnderstandingState(sb: SupabaseClient, indexId: string): Promise<void> {
  await sb.from("document_ai_pages").delete().eq("index_id", indexId);
}

function withOemColumns(row: Omit<PartReferenceInsertRow, "part_number_raw" | "part_number_normalized" | "part_number_search">): PartReferenceInsertRow {
  const raw = pickBestOemRaw(row.part_number_candidate, row.part_number_verified);
  const triple = oemTripleFromRaw(raw);
  return {
    ...row,
    part_number_raw: triple.partNumberRaw,
    part_number_normalized: triple.partNumberNormalized,
    part_number_search: triple.partNumberSearch,
  };
}

export async function batchInsertPartReferences(
  sb: SupabaseClient,
  rows: PartReferenceInsertRow[],
): Promise<number> {
  if (!rows.length) return 0;
  const enriched = rows.map((r) => withOemColumns(r));
  let inserted = 0;
  for (let i = 0; i < enriched.length; i += BATCH_SIZE) {
    const batch = enriched.slice(i, i + BATCH_SIZE);
    const { error } = await sb.from("document_ai_part_references").insert(batch);
    if (!error) inserted += batch.length;
  }
  return inserted;
}

export async function insertListinoPartReferences(
  sb: SupabaseClient,
  input: {
    indexId: string;
    pageId: string;
    docTitle: string;
    rows: Array<{ codice: string; descrizione: string; costo: number; marca?: string }>;
  },
): Promise<number> {
  const rows: PartReferenceInsertRow[] = input.rows.map((row) => {
    const price = buildExtractedPartPrice({
      listPrice: row.costo,
      pageKind: "price_list",
      sourceTitle: input.docTitle,
    });
    return {
      index_id: input.indexId,
      page_id: input.pageId,
      part_number_candidate: row.codice,
      part_number_verified: row.codice,
      description: row.descrizione,
      source: "table",
      price_candidate: price,
    };
  });
  return batchInsertPartReferences(sb, rows);
}

export type FinalizeUnderstandingInput = {
  modelId: string;
  partsExtracted: number;
  pagesProcessed: number;
  partsWithPageEvidence: number;
  chunkSuccessRate: number;
  hasExploded: boolean;
  hasTables: boolean;
  isListino: boolean;
  listinoFailedChunks?: number;
  ocrPageRatio?: number;
  warnings?: string[];
  phaseMetadata?: Record<string, unknown>;
};

export async function finalizeDocumentUnderstanding(
  sb: SupabaseClient,
  indexId: string,
  input: FinalizeUnderstandingInput,
): Promise<void> {
  const quality = evaluateExtractionQuality({
    partsExtracted: input.partsExtracted,
    pagesProcessed: input.pagesProcessed,
    chunkSuccessRate: input.chunkSuccessRate,
    partsWithPageEvidence: input.partsWithPageEvidence,
    ocrPageRatio: input.ocrPageRatio,
    isListino: input.isListino,
    listinoFailedChunks: input.listinoFailedChunks,
  });

  const warnings = [...(input.warnings ?? []), ...quality.warnings];
  const hasRelations = input.partsExtracted > 0 && quality.understandingStatus !== "failed";

  await sb
    .from("document_ai_index")
    .update({
      understanding_status: quality.understandingStatus,
      index_quality: quality.indexQuality,
      error_code: null,
      error_message: null,
      document_capabilities: {
        text: false,
        tables: input.hasTables || input.isListino,
        images: true,
        exploded_views: input.hasExploded,
        part_relations: hasRelations,
      },
      extraction_reliability: quality.extractionReliability,
      metadata_json: {
        modelId: input.modelId,
        pagesClassified: input.pagesProcessed,
        pagesProcessed: input.pagesProcessed,
        partsExtracted: input.partsExtracted,
        partsWithPageEvidence: input.partsWithPageEvidence,
        chunkSuccessRate: input.chunkSuccessRate,
        listinoExtraction: input.isListino,
        ocrPageRatio: input.ocrPageRatio ?? 0,
        warnings,
        ...input.phaseMetadata,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", indexId);

  if (quality.understandingStatus === "failed") {
    throw new Error("EXTRACTION_QUALITY_FAILED");
  }
}
