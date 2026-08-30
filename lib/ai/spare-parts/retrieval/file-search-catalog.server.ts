import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { readSparePartsIdentificationModel } from "@/lib/ai/spare-parts/config";
import { resolveFileSearchApiKey } from "@/lib/ai/spare-parts/indexing/file-search-index.server";
import { toSearchCode } from "@/lib/ai/spare-parts/retrieval/oem-code-normalize";
import { logAiObs } from "@/lib/ai/runtime/observability";

const fileSearchHitSchema = z.object({
  partNumber: z.string().optional(),
  description: z.string().optional(),
  documentTitle: z.string().optional(),
  excerpt: z.string().optional(),
  pageHint: z.string().optional(),
});

const fileSearchResponseSchema = z.object({
  hits: z.array(fileSearchHitSchema).default([]),
});

export type FileSearchCatalogHit = {
  documentoId: string;
  documentTitle: string;
  indexId: string;
  partNumber: string | null;
  description: string | null;
  excerpt: string | null;
  pageHint: string | null;
  matchScore: number;
};

const FILE_SEARCH_MIN_STRUCTURED_HITS = 2;
const FILE_SEARCH_MIN_SCORE = 0.55;

async function getGenAiClient(apiKey: string) {
  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({ apiKey });
}

function parseFileSearchJson(text: string): z.infer<typeof fileSearchResponseSchema> {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { hits: [] };
  try {
    const parsed = JSON.parse(jsonMatch[0] as string);
    return fileSearchResponseSchema.parse(parsed);
  } catch {
    return { hits: [] };
  }
}

export async function queryFileSearchCatalog(
  sb: SupabaseClient,
  input: {
    query: string;
    visibleCodes?: string[];
    vehicleBrand?: string;
    limit?: number;
  },
): Promise<FileSearchCatalogHit[]> {
  const apiKey = await resolveFileSearchApiKey();
  if (!apiKey) return [];

  const { data: indexes } = await sb
    .from("document_ai_index")
    .select("id, documento_id, gemini_store_name, gemini_file_name")
    .eq("is_active", true)
    .eq("status", "indexed")
    .in("understanding_status", ["ready", "ready_with_warnings"])
    .not("gemini_store_name", "is", null);

  if (!indexes?.length) return [];

  const storeNames = [...new Set(indexes.map((i) => i.gemini_store_name as string).filter(Boolean))];
  if (!storeNames.length) return [];

  const docIds = indexes.map((i) => i.documento_id as string);
  const { data: docs } = await sb.from("documenti").select("id, meta, marca").in("id", docIds);

  const codes = (input.visibleCodes ?? []).map((c) => toSearchCode(c)).filter(Boolean) as string[];
  const prompt = `Find spare part matches in uploaded catalogs/price lists.
Query: ${input.query}
${input.vehicleBrand ? `Vehicle brand: ${input.vehicleBrand}` : ""}
${codes.length ? `OEM codes: ${codes.join(", ")}` : ""}
Return JSON only: {"hits":[{"partNumber":"","description":"","documentTitle":"","excerpt":"","pageHint":""}]}
Max ${input.limit ?? 8} hits. Use only evidence from documents.`;

  const client = await getGenAiClient(apiKey);
  const modelId = readSparePartsIdentificationModel();

  try {
    const response = await client.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        tools: [{ fileSearch: { fileSearchStoreNames: storeNames } }],
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "";
    const parsed = parseFileSearchJson(text);
    const hits: FileSearchCatalogHit[] = [];

    for (const hit of parsed.hits) {
      const partNumber = hit.partNumber?.trim() || null;
      const title = hit.documentTitle?.trim() || "Catalogo";
      const doc =
        (docs ?? []).find((d) => {
          const meta = (d.meta as Record<string, unknown>) ?? {};
          const nome = typeof meta.nome === "string" ? meta.nome : "";
          return nome && title.includes(nome);
        }) ?? docs?.[0];
      if (!doc) continue;
      const idx = indexes.find((i) => i.documento_id === doc.id);
      if (!idx) continue;
      hits.push({
        documentoId: doc.id as string,
        documentTitle: title,
        indexId: idx.id as string,
        partNumber,
        description: hit.description?.trim() || null,
        excerpt: hit.excerpt?.trim() || null,
        pageHint: hit.pageHint?.trim() || null,
        matchScore: partNumber ? 0.72 : 0.45,
      });
    }

    logAiObs("AI_RESPONSE", {
      operation: "spare_parts_retrieval_file_search",
      hitCount: hits.length,
      storeCount: storeNames.length,
    });

    return hits.slice(0, input.limit ?? 8);
  } catch (error) {
    logAiObs("AI_ERROR", {
      operation: "spare_parts_retrieval_file_search",
      message: error instanceof Error ? error.message : "FILE_SEARCH_QUERY_FAILED",
    });
    return [];
  }
}

export function shouldRunFileSearchFallback(structuredHits: number, maxStructuredScore: number): boolean {
  return structuredHits < FILE_SEARCH_MIN_STRUCTURED_HITS || maxStructuredScore < FILE_SEARCH_MIN_SCORE;
}
