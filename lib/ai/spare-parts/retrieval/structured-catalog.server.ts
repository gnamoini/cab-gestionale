import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SparePartVisualAnalysis } from "@/lib/ai/spare-parts/types/schemas";

export type StructuredCatalogHit = {
  documentoId: string;
  documentTitle: string;
  indexId: string;
  indexQuality: string | null;
  pageNumber: number;
  positionNumber: string | null;
  diagramLabel: string | null;
  partNumberCandidate: string | null;
  partNumberVerified: string | null;
  description: string | null;
  marca: string;
  modello: string | null;
};

export async function queryStructuredCatalog(
  sb: SupabaseClient,
  input: {
    vehicleBrand?: string;
    vehicleModel?: string;
    visual: SparePartVisualAnalysis;
    limit?: number;
  },
): Promise<StructuredCatalogHit[]> {
  const limit = input.limit ?? 20;

  let docQuery = sb
    .from("documenti")
    .select("id, marca, modello, meta, categoria")
    .limit(50);

  if (input.vehicleBrand?.trim()) {
    docQuery = docQuery.ilike("marca", input.vehicleBrand.trim());
  }
  if (input.vehicleModel?.trim()) {
    docQuery = docQuery.ilike("modello", `%${input.vehicleModel.trim()}%`);
  }

  const { data: docs } = await docQuery;
  if (!docs?.length) return [];

  const docIds = docs.map((d) => d.id as string);
  const { data: indexes } = await sb
    .from("document_ai_index")
    .select("id, documento_id, index_quality")
    .in("documento_id", docIds)
    .eq("is_active", true)
    .eq("status", "indexed")
    .eq("understanding_status", "ready");

  if (!indexes?.length) return [];

  const indexIds = indexes.map((i) => i.id as string);
  const indexByDoc = new Map(indexes.map((i) => [i.documento_id as string, i]));

  const searchTerms = [
    input.visual.normalizedDescription,
    input.visual.partType,
    ...input.visual.visibleCodes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const { data: parts } = await sb
    .from("document_ai_part_references")
    .select(
      "id, index_id, page_id, position_number, part_number_candidate, part_number_verified, description, document_ai_pages(page_number)",
    )
    .in("index_id", indexIds)
    .limit(200);

  const hits: StructuredCatalogHit[] = [];
  for (const part of parts ?? []) {
    const idx = indexes.find((i) => i.id === part.index_id);
    if (!idx) continue;
    const doc = docs.find((d) => d.id === idx.documento_id);
    if (!doc) continue;

    const desc = `${part.description ?? ""} ${part.part_number_candidate ?? ""} ${part.part_number_verified ?? ""}`.toLowerCase();
    const codeMatch = input.visual.visibleCodes.some((c) => desc.includes(c.toLowerCase()));
    const textMatch = searchTerms.split(/\s+/).some((t) => t.length > 3 && desc.includes(t));
    if (!codeMatch && !textMatch && input.visual.visibleCodes.length === 0 && !textMatch) continue;

    const pageJoin = part.document_ai_pages as { page_number?: number } | { page_number?: number }[] | null;
    const pageNumber = Array.isArray(pageJoin)
      ? pageJoin[0]?.page_number
      : pageJoin?.page_number;

    const meta = (doc.meta as Record<string, unknown>) ?? {};
    hits.push({
      documentoId: doc.id as string,
      documentTitle: (typeof meta.nome === "string" ? meta.nome : doc.marca) as string,
      indexId: idx.id as string,
      indexQuality: (idx.index_quality as string) ?? null,
      pageNumber: pageNumber ?? 0,
      positionNumber: part.position_number as string | null,
      diagramLabel: null,
      partNumberCandidate: part.part_number_candidate as string | null,
      partNumberVerified: part.part_number_verified as string | null,
      description: part.description as string | null,
      marca: doc.marca as string,
      modello: (doc.modello as string) ?? null,
    });
    if (hits.length >= limit) break;
  }

  return hits;
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
  let q = sb.from("documenti").select("id, marca, modello, meta").limit(30);
  if (input.vehicleBrand?.trim()) q = q.ilike("marca", input.vehicleBrand.trim());
  if (input.vehicleModel?.trim()) q = q.ilike("modello", `%${input.vehicleModel.trim()}%`);
  const { data: docs } = await q;
  if (!docs?.length) return [];

  const ids = docs.map((d) => d.id as string);
  const { data: indexes } = await sb
    .from("document_ai_index")
    .select("documento_id, status, understanding_status, index_quality, document_capabilities, is_active")
    .in("documento_id", ids)
    .eq("is_active", true);

  return docs.map((doc) => {
    const idx = indexes?.find((i) => i.documento_id === doc.id);
    const meta = (doc.meta as Record<string, unknown>) ?? {};
    const aiEnabled = meta.aiSparePartsEnabled === true;
    return {
      documentoId: doc.id as string,
      title: (typeof meta.nome === "string" ? meta.nome : `${doc.marca} ${doc.modello ?? ""}`.trim()) as string,
      fileSearchStatus: !aiEnabled ? "not_enabled" : (idx?.status as string) ?? "not_indexed",
      understandingStatus: (idx?.understanding_status as string) ?? "pending",
      indexQuality: (idx?.index_quality as string) ?? null,
      capabilities: (idx?.document_capabilities as Record<string, boolean>) ?? {},
    };
  });
}
