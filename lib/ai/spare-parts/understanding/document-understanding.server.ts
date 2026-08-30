import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  estimateListinoPdfGeminiCalls,
  LISTINO_PREFLIGHT_MAX_ESTIMATED_CALLS,
  parseListinoPdfWithAi,
} from "@/lib/ai/listino-import-analysis";
import { aiService } from "@/lib/ai/runtime/service";
import { readRuntimeTimeoutMs } from "@/lib/ai/runtime/env-reader";
import {
  readSparePartsDocumentAnalysisModel,
  readSparePartsListinoChunkDelayMs,
  readSparePartsListinoPagesPerChunkMin,
} from "@/lib/ai/spare-parts/config";
import { buildExtractedPartPrice } from "@/lib/ai/spare-parts/understanding/extracted-part-price";
import {
  batchInsertPartReferences,
  clearDocumentUnderstandingState,
  finalizeDocumentUnderstanding,
  insertListinoPartReferences,
  type PartReferenceInsertRow,
} from "@/lib/ai/spare-parts/understanding/document-understanding-persist.server";
import { getPdfPageCount, splitPdfIntoPageRangeChunks } from "@/lib/ai/pdf-page-ranges.server";
import { extractPdfTextPages } from "@/lib/ai/pdf-text-pages.server";
import {
  ocrPageRatio,
  probePdfPageQuality,
} from "@/lib/ai/spare-parts/understanding/pdf-page-quality-probe.server";
import { loadDocumentBytes } from "@/lib/ai/spare-parts/indexing/file-search-index.server";
import { isListinoDocument } from "@/lib/documents/document-listino-detect";
import { readDocumentSparePartsMeta } from "@/lib/documents/document-spare-parts-meta";
import { AI_PROMPT_BOUNDARY_GUARD } from "@/lib/ai/prompt-boundary-guard";
import { partExtractionSchema } from "@/lib/ai/spare-parts/types/schemas";

const SYSTEM_EXTRACT = `Extract spare parts from catalog PDF pages: position number, part number, description as printed, and list price when present.
Do not invent codes or prices.${AI_PROMPT_BOUNDARY_GUARD}`;

const CATALOG_PAGES_PER_CHUNK = 8;
const CATALOG_MAX_CHUNKS = 24;

function pageKindForPart(source: string): "table" | "exploded" | "price_list" {
  if (source === "diagram" || source === "both") return "exploded";
  return "table";
}

async function runListinoUnderstanding(
  sb: SupabaseClient,
  indexId: string,
  loaded: { bytes: Buffer; meta: Record<string, unknown> },
  docTitle: string,
  marca: string,
  modelId: string,
): Promise<void> {
  const bytes = new Uint8Array(loaded.bytes);
  const pagesPerChunkMin = readSparePartsListinoPagesPerChunkMin();
  const chunkDelayMs = readSparePartsListinoChunkDelayMs();
  const estimate = await estimateListinoPdfGeminiCalls(bytes, { pagesPerChunkMin });
  if (estimate.estimatedApiCalls > LISTINO_PREFLIGHT_MAX_ESTIMATED_CALLS) {
    throw new Error(
      `AI_QUOTA_EXCEEDED: listino stimato ${estimate.estimatedApiCalls} chiamate Gemini (${estimate.pageCount} pagine). Usa import Excel in Magazzino o attendi reset quota.`,
    );
  }

  const parsed = await parseListinoPdfWithAi(bytes, marca, {
    pagesPerChunkMin,
    chunkDelayMs,
    maxQuotaRetriesPerChunk: 1,
  });
  if (!parsed.ok) {
    throw new Error(parsed.message);
  }

  const { data: page } = await sb
    .from("document_ai_pages")
    .insert({
      index_id: indexId,
      page_number: 1,
      page_kind: "price_list",
      extraction_level: "B",
      group_label: "listino",
    })
    .select("id")
    .single();

  if (!page?.id) throw new Error("LISTINO_PAGE_PERSIST_FAILED");

  const partsInserted = await insertListinoPartReferences(sb, {
    indexId,
    pageId: page.id as string,
    docTitle,
    rows: parsed.rows,
  });

  if (partsInserted === 0) throw new Error("LISTINO_NO_PARTS_EXTRACTED");

  const stats = parsed.stats;
  const chunkSuccessRate =
    stats.chunkCount > 0 ? stats.chunksSucceeded / stats.chunkCount : 1;

  await finalizeDocumentUnderstanding(sb, indexId, {
    modelId,
    partsExtracted: partsInserted,
    pagesProcessed: 1,
    partsWithPageEvidence: partsInserted,
    chunkSuccessRate,
    hasExploded: false,
    hasTables: true,
    isListino: true,
    listinoFailedChunks: stats.chunksFailed,
    warnings: parsed.warnings,
    phaseMetadata: {
      listinoStats: stats,
      preflightEstimatedCalls: estimate.estimatedApiCalls,
    },
  });
}

async function runCatalogUnderstanding(
  sb: SupabaseClient,
  indexId: string,
  loaded: { bytes: Buffer; meta: Record<string, unknown> },
  docTitle: string,
  modelId: string,
): Promise<void> {
  const bytes = new Uint8Array(loaded.bytes);
  const pageCount = await getPdfPageCount(bytes);
  const qualityReport = await probePdfPageQuality(bytes);
  const ocrRatio = ocrPageRatio(qualityReport, pageCount);

  const nativePages = await extractPdfTextPages(bytes);
  const nativeTextByPage = new Map(nativePages.map((p) => [p.pageNumber, p.text]));

  const chunks =
    pageCount <= CATALOG_PAGES_PER_CHUNK
      ? [{ fromPage: 1, toPage: pageCount, bytes }]
      : await splitPdfIntoPageRangeChunks(bytes, CATALOG_PAGES_PER_CHUNK);

  if (chunks.length > CATALOG_MAX_CHUNKS) {
    throw new Error(`CATALOG_TOO_LARGE:${pageCount}`);
  }

  const extractedParts: z.infer<typeof partExtractionSchema>["parts"] = [];
  let chunksSucceeded = 0;
  const chunkErrors: string[] = [];

  for (const chunk of chunks) {
    const ocrPagesInChunk = Array.from(
      { length: chunk.toPage - chunk.fromPage + 1 },
      (_, i) => chunk.fromPage + i,
    ).filter((n) => qualityReport.ocrCandidatePages.includes(n));

    const nativeHints = Array.from(
      { length: chunk.toPage - chunk.fromPage + 1 },
      (_, i) => chunk.fromPage + i,
    )
      .map((n) => {
        const text = nativeTextByPage.get(n);
        if (!text || text.length < 40) return null;
        return `Page ${n} native text excerpt: ${text.slice(0, 1200)}`;
      })
      .filter(Boolean)
      .join("\n");

    const extractResult = await aiService.generateObject<z.infer<typeof partExtractionSchema>>({
      schema: partExtractionSchema,
      system: SYSTEM_EXTRACT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract spare parts from PDF pages ${chunk.fromPage}-${chunk.toPage} of ${pageCount}.
Set pageNumber to the real page number in the document. Include listPrice when a price column exists.
${ocrPagesInChunk.length ? `Scanned/low-text pages in this chunk (use vision): ${ocrPagesInChunk.join(", ")}.` : ""}
${nativeHints ? `\nNative text hints:\n${nativeHints}` : ""}`,
            },
            { type: "file", data: Buffer.from(chunk.bytes), mediaType: "application/pdf" },
          ],
        },
      ],
      operation: "spare_parts_extract_pdf",
      timeoutMs: readRuntimeTimeoutMs(),
      maxRetries: 0,
    });
    if (extractResult.ok) {
      chunksSucceeded += 1;
      extractedParts.push(...extractResult.data.object.parts);
    } else {
      chunkErrors.push(`pages ${chunk.fromPage}-${chunk.toPage}: ${extractResult.message}`);
    }
  }

  const chunkSuccessRate = chunks.length > 0 ? chunksSucceeded / chunks.length : 0;
  if (chunkSuccessRate < 0.5) {
    throw new Error(`CATALOG_CHUNK_FAILURE:${chunkErrors.join("; ").slice(0, 400)}`);
  }

  const hasRelations = extractedParts.some((p) => p.partNumberVerified || p.partNumberCandidate);
  if (!hasRelations) throw new Error("CATALOG_NO_PARTS_EXTRACTED");

  const pageIdByNumber = new Map<number, string>();
  const explodedIdByPage = new Map<number, string>();
  const partRows: PartReferenceInsertRow[] = [];

  for (const part of extractedParts) {
    const pageNum = part.pageNumber;
    const kind = pageKindForPart(part.source);

    if (!pageIdByNumber.has(pageNum)) {
      const { data: inserted } = await sb
        .from("document_ai_pages")
        .insert({
          index_id: indexId,
          page_number: pageNum,
          page_kind: kind,
          extraction_level: "B",
          group_label: part.diagramLabel ?? null,
        })
        .select("id")
        .single();
      if (inserted?.id) pageIdByNumber.set(pageNum, inserted.id as string);
    }
    const pageId = pageIdByNumber.get(pageNum);
    if (!pageId) continue;

    let explodedViewId: string | null = null;
    if (kind === "exploded" && !explodedIdByPage.has(pageNum)) {
      const { data: ev } = await sb
        .from("document_ai_exploded_views")
        .insert({
          page_id: pageId,
          diagram_label: part.diagramLabel ?? `page-${pageNum}`,
          extraction_reliability: "partial",
        })
        .select("id")
        .single();
      if (ev?.id) {
        explodedIdByPage.set(pageNum, ev.id as string);
        explodedViewId = ev.id as string;
      }
    } else if (kind === "exploded") {
      explodedViewId = explodedIdByPage.get(pageNum) ?? null;
    }

    partRows.push({
      index_id: indexId,
      page_id: pageId,
      exploded_view_id: explodedViewId,
      part_number_candidate: part.partNumberCandidate ?? null,
      part_number_verified: part.partNumberVerified ?? null,
      description: part.description ?? null,
      quantity: part.quantity ?? null,
      position_number: part.positionNumber ?? null,
      source: part.source,
      price_candidate: buildExtractedPartPrice({
        listPrice: part.listPrice,
        priceCurrency: part.priceCurrency,
        pageKind: kind,
        sourceTitle: docTitle,
      }),
    });
  }

  const partsInserted = await batchInsertPartReferences(sb, partRows);
  const hasExploded = explodedIdByPage.size > 0;

  await finalizeDocumentUnderstanding(sb, indexId, {
    modelId,
    partsExtracted: partsInserted,
    pagesProcessed: pageIdByNumber.size,
    partsWithPageEvidence: partRows.length,
    chunkSuccessRate,
    hasExploded,
    hasTables: pageIdByNumber.size > 0,
    isListino: false,
    ocrPageRatio: ocrRatio,
    warnings: chunkErrors,
    phaseMetadata: {
      ocrPages: qualityReport.ocrCandidatePages,
      pageQuality: qualityReport.pageQuality,
      chunkErrors,
    },
  });
}

export async function runDocumentUnderstandingPipeline(
  sb: SupabaseClient,
  indexId: string,
  documentoId: string,
): Promise<void> {
  const loaded = await loadDocumentBytes(sb, documentoId);
  if (!loaded) throw new Error("DOCUMENT_BYTES_UNAVAILABLE");

  const { data: docRow } = await sb
    .from("documenti")
    .select("meta, categoria, marca")
    .eq("id", documentoId)
    .maybeSingle();

  const docMeta = (docRow?.meta as Record<string, unknown>) ?? {};
  const spare = readDocumentSparePartsMeta(docMeta);
  const docTitle = (typeof docMeta.nome === "string" ? docMeta.nome : "Catalogo") as string;
  const isListino = isListinoDocument({ categoria: docRow?.categoria as string, spare });
  const modelId = readSparePartsDocumentAnalysisModel();
  const marca = (docRow?.marca as string) ?? (typeof docMeta.marca === "string" ? docMeta.marca : "") ?? "";

  await clearDocumentUnderstandingState(sb, indexId);

  if (isListino) {
    await runListinoUnderstanding(sb, indexId, loaded, docTitle, marca, modelId);
    return;
  }

  await runCatalogUnderstanding(sb, indexId, loaded, docTitle, modelId);
}
