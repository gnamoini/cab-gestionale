import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { aiService } from "@/lib/ai/runtime/service";
import { readSparePartsIdentificationModel } from "@/lib/ai/spare-parts/config";
import {
  sparePartVisualAnalysisSchema,
  type CandidatePart,
  type SparePartIdentificationResult,
  type SparePartSearchInput,
} from "@/lib/ai/spare-parts/types/schemas";
import {
  appendSearchStage,
} from "@/lib/ai/spare-parts/queue/part-search-queue.server";
import {
  listConsultedDocuments,
  queryStructuredCatalog,
  type StructuredCatalogHit,
} from "@/lib/ai/spare-parts/retrieval/structured-catalog.server";
import {
  applySourceHierarchyPenalty,
  computeConfidenceScore,
  scoreToConfidenceBand,
  shouldRunWebSearch,
} from "@/lib/ai/spare-parts/ranking/score";
import { isSparePartsMockMode, mockVisualAnalysis } from "@/lib/ai/spare-parts/providers/mock";
import { runWebSearchStage } from "@/lib/ai/spare-parts/retrieval/web.server";
import { AI_PROMPT_BOUNDARY_GUARD } from "@/lib/ai/prompt-boundary-guard";

const VISUAL_SYSTEM = `Analyze workshop spare part photos. Extract structured fields. Do not invent part numbers.${AI_PROMPT_BOUNDARY_GUARD}`;

function hitToCandidate(hit: StructuredCatalogHit, webUsed: boolean): CandidatePart {
  const verified = hit.partNumberVerified;
  const candidate = hit.partNumberCandidate;
  const signals = applySourceHierarchyPenalty(
    {
      visualMatch: 0.5,
      vehicleMatch: 0.8,
      catalogMatch: 0.9,
      explodedViewMatch: hit.positionNumber ? 0.85 : 0.3,
      partsTableMatch: verified ? 0.9 : 0.6,
      oemCodeMatch: verified ? 1 : candidate ? 0.5 : 0,
      dimensionMatch: 0,
      priceEvidence: 0,
      webEvidence: webUsed ? 0.2 : 0,
      historicalConfirmation: 0,
    },
    true,
  );
  const score = computeConfidenceScore(signals);
  const band = scoreToConfidenceBand(score);
  return {
    candidatePartNumber: candidate,
    verifiedPartNumber: verified,
    manufacturer: hit.marca,
    description: hit.description ?? hit.documentTitle,
    compatibility: [{ brand: hit.marca, model: hit.modello ?? undefined }],
    priceCandidate: null,
    verifiedPrice: null,
    confidenceScore: score,
    confidenceBand: band,
    evidence: [
      {
        type: hit.positionNumber ? "exploded_view" : "catalog",
        documentId: hit.documentoId,
        pageNumber: hit.pageNumber || undefined,
        positionNumber: hit.positionNumber ?? undefined,
        title: hit.documentTitle,
        excerpt: hit.description ?? undefined,
        priority: 10,
      },
    ],
  };
}

export async function runPartSearchPipeline(
  sb: SupabaseClient,
  searchId: string,
  input: SparePartSearchInput,
): Promise<SparePartIdentificationResult> {
  const t0 = Date.now();
  const modelId = readSparePartsIdentificationModel();

  await appendSearchStage(sb, searchId, { key: "image_analysis", label: "Analisi immagini", status: "running" });

  const visualResult = isSparePartsMockMode()
    ? { ok: true as const, data: { object: mockVisualAnalysis({
        description: input.description,
        vehicleBrand: input.vehicleBrand,
        vehicleModel: input.vehicleModel,
      }) } }
    : await aiService.generateObject<z.infer<typeof sparePartVisualAnalysisSchema>>({
    schema: sparePartVisualAnalysisSchema,
    system: VISUAL_SYSTEM,
    prompt: `Description: ${input.description}\nAdditional: ${input.additionalInfo ?? ""}\nVehicle: ${input.vehicleBrand ?? ""} ${input.vehicleModel ?? ""} ${input.vehicleYear ?? ""}`,
    operation: "spare_parts_visual_analysis",
  });

  const visual = visualResult.ok
    ? visualResult.data.object
    : {
        normalizedDescription: input.description,
        visibleCodes: [] as string[],
        visualFeatures: [] as string[],
      };

  await appendSearchStage(sb, searchId, { key: "image_analysis", label: "Analisi immagini", status: "completed" });
  await appendSearchStage(sb, searchId, { key: "catalog_retrieval", label: "Ricerca nei cataloghi CAB", status: "running" });

  const consulted = await listConsultedDocuments(sb, {
    vehicleBrand: input.vehicleBrand ?? visual.vehicleBrand,
    vehicleModel: input.vehicleModel ?? visual.vehicleModel,
  });

  const hits = await queryStructuredCatalog(sb, {
    vehicleBrand: input.vehicleBrand ?? visual.vehicleBrand,
    vehicleModel: input.vehicleModel ?? visual.vehicleModel,
    visual,
  });

  await appendSearchStage(sb, searchId, { key: "catalog_retrieval", label: "Ricerca nei cataloghi CAB", status: "completed" });

  const probeSignals = {
    visualMatch: 0.5,
    vehicleMatch: input.vehicleModel ? 0.7 : 0.3,
    catalogMatch: hits.length > 0 ? 0.8 : 0,
    explodedViewMatch: hits.some((h) => h.positionNumber) ? 0.8 : 0,
    partsTableMatch: hits.some((h) => h.partNumberVerified) ? 0.85 : 0.4,
    oemCodeMatch: 0,
    dimensionMatch: 0,
    priceEvidence: 0,
    webEvidence: 0,
    historicalConfirmation: 0,
  };

  let webUsed = false;
  let webCount = 0;
  const catalogCandidates: CandidatePart[] = hits.map((h) => hitToCandidate(h, false));
  const candidates: CandidatePart[] = [...catalogCandidates];

  if (shouldRunWebSearch(probeSignals)) {
    await appendSearchStage(sb, searchId, { key: "web_search", label: "Ricerca web", status: "running" });
    const web = await runWebSearchStage({
      query: input.description,
      vehicleBrand: input.vehicleBrand ?? visual.vehicleBrand,
      vehicleModel: input.vehicleModel ?? visual.vehicleModel,
    });
    webUsed = web.used;
    webCount = web.webCount;
    if (web.hits.length > 0) {
      for (const hit of web.hits) {
        candidates.push({
          candidatePartNumber: hit.candidatePartNumber,
          verifiedPartNumber: null,
          manufacturer: visual.manufacturer ?? null,
          description: hit.excerpt,
          compatibility: [],
          priceCandidate: null,
          verifiedPrice: null,
          confidenceScore: 0.25,
          confidenceBand: "low",
          evidence: [
            {
              type: "web",
              url: hit.url,
              title: hit.title,
              excerpt: hit.excerpt,
              priority: 1,
            },
          ],
        });
      }
    }
    await appendSearchStage(sb, searchId, { key: "web_search", label: "Ricerca web", status: "completed" });
  } else {
    await appendSearchStage(sb, searchId, { key: "web_search", label: "Ricerca web", status: "skipped" });
  }

  await appendSearchStage(sb, searchId, { key: "ranking", label: "Confronto candidati", status: "running" });

  candidates.sort((a, b) => b.confidenceScore - a.confidenceScore);

  const best = candidates[0] ?? null;
  const alternatives = candidates.slice(1, 4);

  let status: SparePartIdentificationResult["status"] = "not_found";
  if (best) {
    if (best.verifiedPartNumber && best.confidenceBand === "high") status = "identified";
    else if (best.confidenceBand === "high" || best.confidenceBand === "medium") status = "probable";
    else if (alternatives.length > 0) status = "ambiguous";
    else status = "probable";
  }

  const warnings: string[] = [];
  if (webUsed && !best?.verifiedPartNumber) {
    warnings.push("Risultato da fonti web non verificate — codice candidato, non confermato.");
  }
  if (hits.length === 0) {
    warnings.push("Nessuna corrispondenza strutturata nei cataloghi indicizzati per questo mezzo.");
  }

  const result: SparePartIdentificationResult = {
    status,
    requestedPart: {
      description: input.description,
      manufacturer: visual.manufacturer,
      vehicleBrand: input.vehicleBrand ?? visual.vehicleBrand,
      vehicleModel: input.vehicleModel ?? visual.vehicleModel,
    },
    bestMatch: best,
    alternatives,
    warnings,
    sourcesConsulted: [
      ...consulted.map((c) => ({
        documentId: c.documentoId,
        title: c.title,
        status:
          c.understandingStatus === "ready"
            ? ("ready" as const)
            : c.fileSearchStatus === "indexed"
              ? ("indexing" as const)
              : c.fileSearchStatus === "failed"
                ? ("failed" as const)
                : ("not_indexed" as const),
        indexQuality: c.indexQuality ?? undefined,
      })),
      ...(webCount > 0
        ? [{ title: `${webCount} fonti web consultate`, status: "consulted" as const, webCount }]
        : []),
    ],
  };

  await appendSearchStage(sb, searchId, { key: "ranking", label: "Confronto candidati", status: "completed" });

  await sb
    .from("ai_part_searches")
    .update({
      status: "completed",
      result_json: result,
      sources_consulted: result.sourcesConsulted,
      model_id: modelId,
      duration_ms: Date.now() - t0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", searchId);

  if (best) {
    const { data: candRow } = await sb
      .from("ai_part_candidates")
      .insert({
        search_id: searchId,
        rank_order: 0,
        candidate_part_number: best.candidatePartNumber,
        verified_part_number: best.verifiedPartNumber,
        manufacturer: best.manufacturer,
        description: best.description,
        compatibility_json: best.compatibility,
        price_candidate: best.priceCandidate,
        verified_price: best.verifiedPrice,
        confidence_score: best.confidenceScore,
        confidence_band: best.confidenceBand,
        is_best_match: true,
      })
      .select("id")
      .single();

    for (const ev of best.evidence) {
      await sb.from("ai_part_evidence").insert({
        search_id: searchId,
        candidate_id: candRow?.id ?? null,
        evidence_type: ev.type,
        document_id: ev.documentId ?? null,
        page_number: ev.pageNumber ?? null,
        position_number: ev.positionNumber ?? null,
        url: ev.url ?? null,
        title: ev.title,
        excerpt: ev.excerpt ?? null,
        priority: ev.priority ?? 0,
      });
    }
  }

  return result;
}
