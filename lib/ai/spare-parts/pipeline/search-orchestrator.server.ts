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
  magazzinoHitToPrice,
  queryMagazzinoCatalog,
  type MagazzinoCatalogHit,
} from "@/lib/ai/spare-parts/retrieval/magazzino-catalog.server";
import {
  applySourceHierarchyPenalty,
  computeConfidenceScore,
  scoreToConfidenceBand,
  shouldRunWebSearch,
} from "@/lib/ai/spare-parts/ranking/score";
import { isSparePartsMockMode, mockVisualAnalysis } from "@/lib/ai/spare-parts/providers/mock";
import { runWebSearchStage } from "@/lib/ai/spare-parts/retrieval/web.server";
import { AI_PROMPT_BOUNDARY_GUARD } from "@/lib/ai/prompt-boundary-guard";
import { buildCatalogSearchQuery } from "@/lib/ai/spare-parts/retrieval/catalog-text-match";
import {
  queryFileSearchCatalog,
  shouldRunFileSearchFallback,
} from "@/lib/ai/spare-parts/retrieval/file-search-catalog.server";
import { computeRetrievalRescueMetrics } from "@/lib/ai/spare-parts/retrieval/retrieval-rescue-metrics";
import { logAiObs } from "@/lib/ai/runtime/observability";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";

const VISUAL_SYSTEM = `Analyze workshop spare part photos. Extract structured fields including visible OEM/part codes on labels. Do not invent part numbers.${AI_PROMPT_BOUNDARY_GUARD}`;

async function loadSearchAssetImages(
  sb: SupabaseClient,
  paths: string[],
): Promise<Array<{ data: Buffer; mediaType: string }>> {
  const out: Array<{ data: Buffer; mediaType: string }> = [];
  for (const path of paths.slice(0, 6)) {
    const { data, error } = await sb.storage.from(STORAGE_BUCKETS.images).download(path);
    if (error || !data) continue;
    const bytes = Buffer.from(await data.arrayBuffer());
    const mediaType =
      path.toLowerCase().endsWith(".png")
        ? "image/png"
        : path.toLowerCase().endsWith(".webp")
          ? "image/webp"
          : "image/jpeg";
    out.push({ data: bytes, mediaType });
  }
  return out;
}

function fileSearchHitToCandidate(hit: Awaited<ReturnType<typeof queryFileSearchCatalog>>[number]): CandidatePart {
  const score = Math.min(1, 0.38 + hit.matchScore * 0.4);
  return {
    candidatePartNumber: hit.partNumber,
    verifiedPartNumber: null,
    manufacturer: null,
    description: hit.description ?? hit.excerpt ?? hit.documentTitle,
    compatibility: [],
    priceCandidate: null,
    verifiedPrice: null,
    confidenceScore: score,
    confidenceBand: scoreToConfidenceBand(score),
    evidence: [
      {
        type: "catalog",
        documentId: hit.documentoId,
        title: hit.documentTitle,
        excerpt: hit.excerpt ?? hit.description ?? undefined,
        priority: 6,
      },
    ],
  };
}

function candidateDedupeKey(c: CandidatePart): string {
  const code = (c.verifiedPartNumber ?? c.candidatePartNumber ?? "").trim().toUpperCase();
  if (code) return `code:${code}`;
  return `desc:${c.description.trim().toLowerCase().slice(0, 96)}`;
}

function mergeCatalogAndMagazzinoCandidates(
  catalog: CandidatePart[],
  magazzino: CandidatePart[],
): CandidatePart[] {
  const merged = new Map<string, CandidatePart>();
  for (const c of catalog) merged.set(candidateDedupeKey(c), c);
  for (const c of magazzino) {
    const key = candidateDedupeKey(c);
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, c);
      continue;
    }
    const prevPrice = prev.verifiedPrice ?? prev.priceCandidate;
    const nextPrice = c.verifiedPrice ?? c.priceCandidate;
    if (!prevPrice && nextPrice) {
      merged.set(key, { ...prev, priceCandidate: c.priceCandidate, verifiedPrice: c.verifiedPrice });
    }
  }
  return [...merged.values()];
}

function hitToCandidate(hit: StructuredCatalogHit, webUsed: boolean): CandidatePart {
  const verified = hit.partNumberVerified;
  const candidate = hit.partNumberCandidate;
  const price = hit.priceCandidate;
  const signals = applySourceHierarchyPenalty(
    {
      visualMatch: 0.5,
      vehicleMatch: 0.8,
      catalogMatch: 0.9,
      explodedViewMatch: hit.positionNumber ? 0.85 : 0.3,
      partsTableMatch: verified ? 0.9 : 0.6,
      oemCodeMatch: verified ? 1 : candidate ? 0.5 : 0,
      dimensionMatch: 0,
      priceEvidence: price ? 0.85 : 0,
      webEvidence: webUsed ? 0.2 : 0,
      historicalConfirmation: 0,
    },
    true,
  );
  const score = Math.min(1, computeConfidenceScore(signals) + hit.matchScore * 0.08);
  const band = scoreToConfidenceBand(score);
  const priceWithSource = price ? { ...price, sourceTitle: price.sourceTitle ?? hit.documentTitle } : null;
  const evidenceType =
    hit.pageKind === "price_list" || price?.priceType === "list"
      ? ("price_list" as const)
      : hit.positionNumber
        ? ("exploded_view" as const)
        : ("catalog" as const);
  return {
    candidatePartNumber: candidate,
    verifiedPartNumber: verified,
    manufacturer: hit.marca,
    description: hit.description ?? hit.documentTitle,
    compatibility: [{ brand: hit.marca, model: hit.modello ?? undefined }],
    priceCandidate: priceWithSource,
    verifiedPrice: priceWithSource,
    confidenceScore: score,
    confidenceBand: band,
    evidence: [
      {
        type: evidenceType,
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

function magazzinoHitToCandidate(hit: MagazzinoCatalogHit): CandidatePart {
  const price = magazzinoHitToPrice(hit);
  const score = Math.min(1, 0.42 + hit.matchScore * 0.35);
  return {
    candidatePartNumber: hit.codice || null,
    verifiedPartNumber: hit.codice || null,
    manufacturer: hit.marca || null,
    description: hit.nome,
    compatibility: hit.marca ? [{ brand: hit.marca }] : [],
    priceCandidate: price ? { ...price, sourceTitle: price.sourceTitle ?? "Magazzino CAB" } : null,
    verifiedPrice: price ? { ...price, sourceTitle: price.sourceTitle ?? "Magazzino CAB" } : null,
    confidenceScore: score,
    confidenceBand: scoreToConfidenceBand(score),
    evidence: [
      {
        type: "price_list",
        title: "Magazzino CAB",
        excerpt: hit.codice ? `${hit.codice} · ${hit.nome}` : hit.nome,
        priority: 8,
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
  const textOnly = input.assetStoragePaths.length === 0;
  const assetImages = textOnly ? [] : await loadSearchAssetImages(sb, input.assetStoragePaths);

  if (textOnly) {
    await appendSearchStage(sb, searchId, {
      key: "image_analysis",
      label: "Analisi immagini",
      status: "skipped",
    });
  } else {
    await appendSearchStage(sb, searchId, { key: "image_analysis", label: "Analisi immagini", status: "running" });
  }

  const visualResult =
    textOnly || isSparePartsMockMode()
      ? {
          ok: true as const,
          data: {
            object: mockVisualAnalysis({
              description: input.description,
              vehicleBrand: input.vehicleBrand,
              vehicleModel: input.vehicleModel,
            }),
          },
        }
      : await aiService.generateObject<z.infer<typeof sparePartVisualAnalysisSchema>>({
          schema: sparePartVisualAnalysisSchema,
          system: VISUAL_SYSTEM,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Description: ${input.description}\nAdditional: ${input.additionalInfo ?? ""}\nVehicle: ${input.vehicleBrand ?? ""} ${input.vehicleModel ?? ""} ${input.vehicleYear ?? ""}`,
                },
                ...assetImages.map((img) => ({
                  type: "image" as const,
                  image: img.data,
                  mediaType: img.mediaType,
                })),
              ],
            },
          ],
          operation: "spare_parts_visual_analysis",
        });

  const visual = visualResult.ok
    ? visualResult.data.object
    : {
        normalizedDescription: input.description,
        manufacturer: undefined,
        visibleCodes: [] as string[],
        visualFeatures: [] as string[],
        vehicleBrand: undefined,
        vehicleModel: undefined,
        partType: undefined,
      };

  if (!textOnly) {
    await appendSearchStage(sb, searchId, { key: "image_analysis", label: "Analisi immagini", status: "completed" });
  }
  await appendSearchStage(sb, searchId, { key: "catalog_retrieval", label: "Ricerca nei cataloghi CAB", status: "running" });

  const consulted = await listConsultedDocuments(sb, {
    vehicleBrand: input.vehicleBrand ?? visual.vehicleBrand,
    vehicleModel: input.vehicleModel ?? visual.vehicleModel,
  });

  const hits = await queryStructuredCatalog(sb, {
    vehicleBrand: input.vehicleBrand ?? visual.vehicleBrand,
    vehicleModel: input.vehicleModel ?? visual.vehicleModel,
    visual,
    additionalInfo: input.additionalInfo,
  });

  const maxStructuredScore = hits.reduce((m, h) => Math.max(m, h.matchScore), 0);
  let fileSearchHits: Awaited<ReturnType<typeof queryFileSearchCatalog>> = [];

  if (shouldRunFileSearchFallback(hits.length, maxStructuredScore)) {
    await appendSearchStage(sb, searchId, {
      key: "file_search_retrieval",
      label: "Ricerca File Search",
      status: "running",
    });
    const partType = "partType" in visual ? visual.partType : undefined;
    const { fullQuery } = buildCatalogSearchQuery({
      normalizedDescription: visual.normalizedDescription,
      partType,
      additionalInfo: input.additionalInfo,
      visibleCodes: visual.visibleCodes,
      fallbackDescription: input.description,
    });
    fileSearchHits = await queryFileSearchCatalog(sb, {
      query: fullQuery,
      visibleCodes: visual.visibleCodes,
      vehicleBrand: input.vehicleBrand ?? visual.vehicleBrand,
    });
    await appendSearchStage(sb, searchId, {
      key: "file_search_retrieval",
      label: "Ricerca File Search",
      status: "completed",
    });
    logAiObs("AI_RESPONSE", {
      operation: "spare_parts_retrieval_structured",
      structuredHits: hits.length,
      fileSearchHits: fileSearchHits.length,
    });
  } else {
    await appendSearchStage(sb, searchId, {
      key: "file_search_retrieval",
      label: "Ricerca File Search",
      status: "skipped",
    });
  }

  const structuredCodes = hits
    .map((h) => h.partNumberVerified ?? h.partNumberCandidate ?? "")
    .filter(Boolean);
  const fileSearchCodes = fileSearchHits.map((h) => h.partNumber ?? "").filter(Boolean);
  const rescueMetrics = computeRetrievalRescueMetrics({ structuredCodes, fileSearchCodes });
  if (rescueMetrics.file_search_rescued > 0) {
    logAiObs("AI_RESPONSE", {
      operation: "spare_parts_file_search_rescued",
      ...rescueMetrics,
    });
  }

  await appendSearchStage(sb, searchId, { key: "catalog_retrieval", label: "Ricerca nei cataloghi CAB", status: "completed" });

  await appendSearchStage(sb, searchId, {
    key: "magazzino_retrieval",
    label: "Ricerca in magazzino",
    status: "running",
  });
  const magazzinoHits = await queryMagazzinoCatalog(sb, {
    vehicleBrand: input.vehicleBrand ?? visual.vehicleBrand,
    description: input.description,
    additionalInfo: input.additionalInfo,
  });
  await appendSearchStage(sb, searchId, {
    key: "magazzino_retrieval",
    label: "Ricerca in magazzino",
    status: "completed",
  });

  const probeSignals = {
    visualMatch: 0.5,
    vehicleMatch: input.vehicleModel || input.vehicleBrand ? 0.7 : 0.3,
    catalogMatch: hits.length > 0 || magazzinoHits.length > 0 ? 0.8 : 0,
    explodedViewMatch: hits.some((h) => h.positionNumber) ? 0.8 : 0,
    partsTableMatch:
      hits.some((h) => h.partNumberVerified) || magazzinoHits.some((h) => Boolean(h.codice)) ? 0.85 : 0.4,
    oemCodeMatch: 0,
    dimensionMatch: 0,
    priceEvidence: 0,
    webEvidence: 0,
    historicalConfirmation: 0,
  };

  let webUsed = false;
  let webCount = 0;
  const catalogCandidates: CandidatePart[] = hits.map((h) => hitToCandidate(h, false));
  const fileSearchCandidates: CandidatePart[] = fileSearchHits.map((h) => fileSearchHitToCandidate(h));
  const magazzinoCandidates: CandidatePart[] = magazzinoHits.map((h) => magazzinoHitToCandidate(h));
  const candidates: CandidatePart[] = mergeCatalogAndMagazzinoCandidates(
    mergeCatalogAndMagazzinoCandidates(catalogCandidates, fileSearchCandidates),
    magazzinoCandidates,
  );

  if (shouldRunWebSearch(probeSignals) || (hits.length === 0 && magazzinoHits.length === 0)) {
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
  if (hits.length === 0 && magazzinoHits.length === 0 && webCount === 0) {
    warnings.push(
      "Nessuna corrispondenza nei cataloghi PDF indicizzati, in magazzino o sul web per i termini inseriti.",
    );
  } else if (hits.length === 0 && magazzinoHits.length === 0 && webCount > 0) {
    warnings.push("Nessuna corrispondenza strutturata nei cataloghi indicizzati — verificare i risultati web.");
  } else if (hits.length > 0 && magazzinoHits.length === 0) {
    warnings.push("Risultato da listino/catalogo indicizzato — il ricambio potrebbe non essere presente in magazzino.");
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
    retrievalMetrics: rescueMetrics,
    sourcesConsulted: [
      ...consulted.map((c) => ({
        documentId: c.documentoId,
        title: c.title,
        status:
          c.understandingStatus === "ready" || c.understandingStatus === "ready_with_warnings"
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

  const rankedCandidates = best ? [best, ...alternatives] : [];
  for (let rank = 0; rank < rankedCandidates.length; rank++) {
    const cand = rankedCandidates[rank]!;
    const { data: candRow } = await sb
      .from("ai_part_candidates")
      .insert({
        search_id: searchId,
        rank_order: rank,
        candidate_part_number: cand.candidatePartNumber,
        verified_part_number: cand.verifiedPartNumber,
        manufacturer: cand.manufacturer,
        description: cand.description,
        compatibility_json: cand.compatibility,
        price_candidate: cand.priceCandidate,
        verified_price: cand.verifiedPrice,
        confidence_score: cand.confidenceScore,
        confidence_band: cand.confidenceBand,
        is_best_match: rank === 0,
      })
      .select("id")
      .single();

    for (const ev of cand.evidence) {
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
