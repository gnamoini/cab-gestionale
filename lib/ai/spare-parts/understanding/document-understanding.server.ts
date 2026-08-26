import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { aiService } from "@/lib/ai/runtime/service";
import { readSparePartsDocumentAnalysisModel } from "@/lib/ai/spare-parts/config";
import {
  pageClassificationSchema,
  partExtractionSchema,
} from "@/lib/ai/spare-parts/types/schemas";
import { loadDocumentBytes } from "@/lib/ai/spare-parts/indexing/file-search-index.server";
import { AI_PROMPT_BOUNDARY_GUARD } from "@/lib/ai/prompt-boundary-guard";

const SYSTEM_CLASSIFY = `Classify each PDF page by kind: text, table, exploded, manual, cover, index, price_list, other.
Return structured JSON only.${AI_PROMPT_BOUNDARY_GUARD}`;

const SYSTEM_EXTRACT = `Extract spare parts from catalog pages: position number, part number, description.
Link exploded diagram positions to table rows when possible. Do not invent codes.${AI_PROMPT_BOUNDARY_GUARD}`;

export async function runDocumentUnderstandingPipeline(
  sb: SupabaseClient,
  indexId: string,
  documentoId: string,
): Promise<void> {
  const loaded = await loadDocumentBytes(sb, documentoId);
  if (!loaded) throw new Error("DOCUMENT_BYTES_UNAVAILABLE");

  const modelId = readSparePartsDocumentAnalysisModel();

  // Level A — page classification (sample first pages + heuristic for large docs)
  const classifyResult = await aiService.generateObject<z.infer<typeof pageClassificationSchema>>({
    schema: pageClassificationSchema,
    system: SYSTEM_CLASSIFY,
    prompt: `Analyze this spare parts catalog PDF. Document has binary length ${loaded.bytes.length} bytes.
Provide page classifications for pages that likely contain parts tables or exploded views.
If exact page count unknown, classify representative pages 1-20.`,
    operation: "spare_parts_page_classify",
    timeoutMs: 90_000,
  });

  const pages = classifyResult.ok ? classifyResult.data.object.pages : [];

  const usefulKinds = new Set(["exploded", "table", "price_list"]);
  const usefulPages = pages.filter((p) => usefulKinds.has(p.pageKind));

  // Level B — extraction on useful pages only
  let extractedParts: z.infer<typeof partExtractionSchema>["parts"] = [];
  if (usefulPages.length > 0) {
    const extractResult = await aiService.generateObject<z.infer<typeof partExtractionSchema>>({
      schema: partExtractionSchema,
      system: SYSTEM_EXTRACT,
      prompt: `Extract parts from pages: ${usefulPages.map((p) => p.pageNumber).join(", ")}.
Catalog marca/modello from metadata if present.`,
      operation: "spare_parts_extract",
      timeoutMs: 120_000,
    });
    if (extractResult.ok) extractedParts = extractResult.data.object.parts;
  }

  // Persist pages
  const pageIdByNumber = new Map<number, string>();
  for (const p of pages) {
    const { data: inserted } = await sb
      .from("document_ai_pages")
      .insert({
        index_id: indexId,
        page_number: p.pageNumber,
        page_kind: p.pageKind,
        group_label: p.groupLabel ?? null,
        extraction_level: usefulKinds.has(p.pageKind) ? "B" : "A",
      })
      .select("id")
      .single();
    if (inserted?.id) pageIdByNumber.set(p.pageNumber, inserted.id as string);
  }

  const explodedPageIds = new Map<string, string>();
  for (const part of extractedParts) {
    let pageId = pageIdByNumber.get(part.pageNumber);
    if (!pageId) {
      const { data: inserted } = await sb
        .from("document_ai_pages")
        .insert({
          index_id: indexId,
          page_number: part.pageNumber,
          page_kind: "table",
          extraction_level: "B",
        })
        .select("id")
        .single();
      pageId = inserted?.id as string;
      if (pageId) pageIdByNumber.set(part.pageNumber, pageId);
    }
    if (!pageId) continue;

    let explodedViewId: string | null = null;
    if (part.diagramLabel || part.source === "diagram" || part.source === "both") {
      const key = `${part.pageNumber}:${part.diagramLabel ?? "default"}`;
      explodedViewId = explodedPageIds.get(key) ?? null;
      if (!explodedViewId) {
        const { data: ev } = await sb
          .from("document_ai_exploded_views")
          .insert({
            page_id: pageId,
            diagram_label: part.diagramLabel ?? null,
            extraction_reliability: part.partNumberVerified ? "reliable" : "partial",
          })
          .select("id")
          .single();
        explodedViewId = (ev?.id as string) ?? null;
        if (explodedViewId) explodedPageIds.set(key, explodedViewId);
      }
    }

    await sb.from("document_ai_part_references").insert({
      index_id: indexId,
      page_id: pageId,
      exploded_view_id: explodedViewId,
      position_number: part.positionNumber ?? null,
      part_number_candidate: part.partNumberCandidate ?? null,
      part_number_verified: part.partNumberVerified ?? null,
      description: part.description ?? null,
      quantity: part.quantity ?? null,
      source: part.source,
    });
  }

  const hasExploded = extractedParts.some((p) => p.diagramLabel || p.source !== "table");
  const hasRelations = extractedParts.some((p) => p.partNumberVerified || p.partNumberCandidate);
  const indexQuality = hasRelations && hasExploded ? "high" : hasRelations ? "medium" : "low";

  await sb
    .from("document_ai_index")
    .update({
      understanding_status: "ready",
      index_quality: indexQuality,
      document_capabilities: {
        text: pages.some((p) => p.pageKind === "text"),
        tables: pages.some((p) => p.pageKind === "table"),
        images: true,
        exploded_views: hasExploded,
        part_relations: hasRelations,
      },
      extraction_reliability: hasRelations ? "reliable" : "partial",
      metadata_json: { modelId, pagesClassified: pages.length, partsExtracted: extractedParts.length },
      updated_at: new Date().toISOString(),
    })
    .eq("id", indexId);
}
