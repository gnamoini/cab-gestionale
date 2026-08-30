import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PriceEvidence, SparePartVisualAnalysis } from "@/lib/ai/spare-parts/types/schemas";
import { isListinoDocument } from "@/lib/documents/document-listino-detect";
import { readDocumentSparePartsMeta } from "@/lib/documents/document-spare-parts-meta";
import {
  buildCatalogSearchQuery,
  catalogPartMatches,
  escapeIlikeToken,
  scoreCatalogPartMatch,
} from "@/lib/ai/spare-parts/retrieval/catalog-text-match";
import { toSearchCode } from "@/lib/ai/spare-parts/retrieval/oem-code-normalize";

export type StructuredCatalogHit = {
  documentoId: string;
  documentTitle: string;
  indexId: string;
  indexQuality: string | null;
  pageNumber: number;
  pageKind: string | null;
  positionNumber: string | null;
  diagramLabel: string | null;
  partNumberCandidate: string | null;
  partNumberVerified: string | null;
  description: string | null;
  marca: string;
  modello: string | null;
  priceCandidate: PriceEvidence | null;
  matchScore: number;
  matchScope: "vehicle" | "brand" | "catalog" | "exact";
};

type CatalogDocRow = {
  id: string;
  marca: string;
  modello: string | null;
  meta: Record<string, unknown> | null;
  categoria: string | null;
};

const USABLE_UNDERSTANDING = ["ready", "ready_with_warnings"] as const;

function parsePriceCandidate(raw: unknown): PriceEvidence | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const amount = typeof o.amount === "number" ? o.amount : Number(o.amount);
  if (!Number.isFinite(amount)) return null;
  const currency = typeof o.currency === "string" && o.currency.trim() ? o.currency.trim() : "EUR";
  const priceType =
    o.priceType === "list" || o.priceType === "net" || o.priceType === "web" || o.priceType === "unknown"
      ? o.priceType
      : "unknown";
  return {
    amount,
    currency,
    priceType,
    sourceTitle: typeof o.sourceTitle === "string" ? o.sourceTitle : undefined,
  };
}

function buildPartsOrFilter(tokens: string[]): string | null {
  if (!tokens.length) return null;
  return tokens
    .slice(0, 8)
    .flatMap((t) => {
      const e = escapeIlikeToken(t);
      return [
        `description.ilike.%${e}%`,
        `part_number_candidate.ilike.%${e}%`,
        `part_number_verified.ilike.%${e}%`,
        `part_number_search.ilike.%${e}%`,
        `part_number_normalized.ilike.%${e}%`,
      ];
    })
    .join(",");
}

async function fetchCatalogDocs(
  sb: SupabaseClient,
  scope: "vehicle" | "brand" | "catalog",
  vehicleBrand?: string,
  vehicleModel?: string,
): Promise<CatalogDocRow[]> {
  let q = sb.from("documenti").select("id, marca, modello, meta, categoria").limit(scope === "catalog" ? 120 : 60);

  const brand = vehicleBrand?.trim();
  const model = vehicleModel?.trim();

  if (scope === "vehicle" && brand && model) {
    q = q.ilike("marca", `%${escapeIlikeToken(brand)}%`).ilike("modello", `%${escapeIlikeToken(model)}%`);
  } else if (scope === "brand" && brand) {
    q = q.ilike("marca", `%${escapeIlikeToken(brand)}%`);
  }

  const { data } = await q;
  return ((data ?? []) as CatalogDocRow[]).filter(
    (doc) => readDocumentSparePartsMeta(doc.meta).aiSparePartsEnabled === true,
  );
}

async function fetchExactSearchCodeHits(
  sb: SupabaseClient,
  indexIds: string[],
  searchCodes: string[],
): Promise<Array<Record<string, unknown>>> {
  if (!indexIds.length || !searchCodes.length) return [];
  const { data } = await sb
    .from("document_ai_part_references")
    .select(
      "id, index_id, page_id, position_number, part_number_candidate, part_number_verified, part_number_search, description, price_candidate, document_ai_pages(page_number, page_kind)",
    )
    .in("index_id", indexIds)
    .in("part_number_search", searchCodes)
    .limit(120);
  return (data ?? []) as Array<Record<string, unknown>>;
}

function partToHit(
  part: Record<string, unknown>,
  indexes: Array<{ id: string; documento_id: string; index_quality: string | null }>,
  docs: CatalogDocRow[],
  input: {
    searchTokens: string[];
    fullQuery: string;
    visual: SparePartVisualAnalysis;
    matchScope: StructuredCatalogHit["matchScope"];
    exactBoost?: number;
  },
): StructuredCatalogHit | null {
  const idx = indexes.find((i) => i.id === part.index_id);
  if (!idx) return null;
  const doc = docs.find((d) => d.id === idx.documento_id);
  if (!doc) return null;

  const desc = `${part.description ?? ""} ${part.part_number_candidate ?? ""} ${part.part_number_verified ?? ""}`;
  const pageJoin = part.document_ai_pages as
    | { page_number?: number; page_kind?: string }
    | { page_number?: number; page_kind?: string }[]
    | null;
  const pageRow = Array.isArray(pageJoin) ? pageJoin[0] : pageJoin;
  const pageKind = pageRow?.page_kind ?? null;

  let matchScore = scoreCatalogPartMatch(
    desc,
    input.searchTokens,
    input.visual.visibleCodes,
    input.fullQuery,
  );
  if (input.exactBoost) matchScore = Math.min(1, matchScore + input.exactBoost);
  const spare = readDocumentSparePartsMeta(doc.meta);
  if (isListinoDocument({ categoria: doc.categoria, spare })) matchScore += 0.12;
  if (pageKind === "price_list") matchScore += 0.08;
  if (part.price_candidate) matchScore += 0.05;
  matchScore = Math.min(1, matchScore);
  if (!catalogPartMatches(matchScore, desc, input.searchTokens) && !input.exactBoost) return null;

  const meta = (doc.meta as Record<string, unknown>) ?? {};
  const documentTitle = (typeof meta.nome === "string" ? meta.nome : doc.marca) as string;
  const rawPrice = parsePriceCandidate(part.price_candidate);
  const priceCandidate = rawPrice
    ? { ...rawPrice, sourceTitle: rawPrice.sourceTitle ?? documentTitle }
    : null;

  return {
    documentoId: doc.id,
    documentTitle,
    indexId: idx.id as string,
    indexQuality: (idx.index_quality as string) ?? null,
    pageNumber: pageRow?.page_number ?? 0,
    pageKind,
    positionNumber: part.position_number as string | null,
    diagramLabel: null,
    partNumberCandidate: part.part_number_candidate as string | null,
    partNumberVerified: part.part_number_verified as string | null,
    description: part.description as string | null,
    marca: doc.marca,
    modello: doc.modello,
    priceCandidate,
    matchScore,
    matchScope: input.matchScope,
  };
}

async function scorePartsForDocs(
  sb: SupabaseClient,
  docs: CatalogDocRow[],
  input: {
    visual: SparePartVisualAnalysis;
    additionalInfo?: string;
    matchScope: StructuredCatalogHit["matchScope"];
    searchTokens: string[];
    fullQuery: string;
    limit: number;
  },
): Promise<StructuredCatalogHit[]> {
  if (!docs.length) return [];

  const docIds = docs.map((d) => d.id);
  const { data: indexes } = await sb
    .from("document_ai_index")
    .select("id, documento_id, index_quality")
    .in("documento_id", docIds)
    .eq("is_active", true)
    .eq("status", "indexed")
    .in("understanding_status", [...USABLE_UNDERSTANDING]);

  if (!indexes?.length) return [];

  const indexIds = indexes.map((i) => i.id as string);
  const searchCodes = [
    ...new Set(
      [...input.visual.visibleCodes, ...input.searchTokens]
        .map((c) => toSearchCode(c))
        .filter((c): c is string => Boolean(c && c.length >= 3)),
    ),
  ];

  const scored: StructuredCatalogHit[] = [];
  const seen = new Set<string>();

  const exactParts = await fetchExactSearchCodeHits(sb, indexIds, searchCodes);
  for (const part of exactParts) {
    const hit = partToHit(part, indexes, docs, {
      ...input,
      matchScope: "exact",
      exactBoost: 0.35,
    });
    if (!hit) continue;
    const key = `${hit.indexId}:${hit.partNumberVerified ?? ""}:${hit.partNumberCandidate ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    scored.push(hit);
  }

  let partsQuery = sb
    .from("document_ai_part_references")
    .select(
      "id, index_id, page_id, position_number, part_number_candidate, part_number_verified, part_number_search, description, price_candidate, document_ai_pages(page_number, page_kind)",
    )
    .in("index_id", indexIds)
    .limit(800);

  const orFilter = buildPartsOrFilter(input.searchTokens);
  if (orFilter) partsQuery = partsQuery.or(orFilter);

  let { data: parts } = await partsQuery;
  if ((!parts || parts.length === 0) && orFilter) {
    const { data: fallbackParts } = await sb
      .from("document_ai_part_references")
      .select(
        "id, index_id, page_id, position_number, part_number_candidate, part_number_verified, part_number_search, description, price_candidate, document_ai_pages(page_number, page_kind)",
      )
      .in("index_id", indexIds)
      .limit(2000);
    parts = fallbackParts;
  }

  for (const part of parts ?? []) {
    const hit = partToHit(part as Record<string, unknown>, indexes, docs, input);
    if (!hit) continue;
    const key = `${hit.indexId}:${hit.partNumberVerified ?? ""}:${hit.partNumberCandidate ?? ""}:${hit.description ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    scored.push(hit);
  }

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, input.limit);
}

export async function queryStructuredCatalog(
  sb: SupabaseClient,
  input: {
    vehicleBrand?: string;
    vehicleModel?: string;
    visual: SparePartVisualAnalysis;
    additionalInfo?: string;
    limit?: number;
  },
): Promise<StructuredCatalogHit[]> {
  const limit = input.limit ?? 20;
  const { fullQuery, searchTokens } = buildCatalogSearchQuery({
    normalizedDescription: input.visual.normalizedDescription,
    partType: input.visual.partType,
    additionalInfo: input.additionalInfo,
    visibleCodes: input.visual.visibleCodes,
  });

  const scopes: Array<{ scope: StructuredCatalogHit["matchScope"]; brand?: string; model?: string }> = [];
  const brand = input.vehicleBrand?.trim();
  const model = input.vehicleModel?.trim();
  if (brand && model) scopes.push({ scope: "vehicle", brand, model });
  if (brand) scopes.push({ scope: "brand", brand });
  scopes.push({ scope: "catalog" });

  const merged = new Map<string, StructuredCatalogHit>();
  for (const { scope, brand: scopeBrand, model: scopeModel } of scopes) {
    if (scope === "exact") continue;
    const docs = await fetchCatalogDocs(sb, scope, scopeBrand ?? brand, scopeModel ?? model);
    const hits = await scorePartsForDocs(sb, docs, {
      visual: input.visual,
      additionalInfo: input.additionalInfo,
      matchScope: scope,
      searchTokens,
      fullQuery,
      limit,
    });
    for (const hit of hits) {
      const key = `${hit.indexId}:${hit.partNumberVerified ?? ""}:${hit.partNumberCandidate ?? ""}:${hit.description ?? ""}`;
      const prev = merged.get(key);
      if (!prev || hit.matchScore > prev.matchScore) merged.set(key, hit);
    }
    if (merged.size >= limit) break;
  }

  return [...merged.values()].sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
}

export async function listConsultedDocuments(
  sb: SupabaseClient,
  input: { vehicleBrand?: string; vehicleModel?: string },
): Promise<
  Array<{
    documentoId: string;
    title: string;
    fileSearchStatus: string;
    understandingStatus: string;
    indexQuality: string | null;
    capabilities: Record<string, boolean>;
  }>
> {
  const brand = input.vehicleBrand?.trim();
  const model = input.vehicleModel?.trim();
  let docs = await fetchCatalogDocs(sb, brand && model ? "vehicle" : brand ? "brand" : "catalog", brand, model);
  if (!docs.length && brand) {
    docs = await fetchCatalogDocs(sb, "brand", brand);
  }
  if (!docs.length) {
    docs = await fetchCatalogDocs(sb, "catalog");
  }

  const ids = docs.map((d) => d.id);
  const { data: indexes } = await sb
    .from("document_ai_index")
    .select("documento_id, status, understanding_status, index_quality, document_capabilities, is_active")
    .in("documento_id", ids)
    .eq("is_active", true);

  return docs.map((doc) => {
    const idx = indexes?.find((i) => i.documento_id === doc.id);
    const spare = readDocumentSparePartsMeta(doc.meta);
    const meta = doc.meta ?? {};
    return {
      documentoId: doc.id,
      title: (typeof meta.nome === "string" ? meta.nome : `${doc.marca} ${doc.modello ?? ""}`.trim()) as string,
      fileSearchStatus: !spare.aiSparePartsEnabled ? "not_enabled" : (idx?.status as string) ?? "not_indexed",
      understandingStatus: (idx?.understanding_status as string) ?? "pending",
      indexQuality: (idx?.index_quality as string) ?? null,
      capabilities: (idx?.document_capabilities as Record<string, boolean>) ?? {},
    };
  });
}
