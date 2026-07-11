import "server-only";

import { ocrNormKey } from "@/lib/entity-resolution/entity-normalizer";
import type { RecordKnownCorrectionInput } from "@/lib/entity-resolution/known-corrections";
import type { EntityResolutionResult } from "@/lib/entity-resolution/entity-resolution-types";
import { buildCacheEntry } from "@/lib/entity-resolution/resolution-cache";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function recordKnownCorrectionServer(
  sb: SupabaseClient,
  companyId: string,
  userId: string | null,
  input: RecordKnownCorrectionInput,
): Promise<void> {
  const ocrKey = ocrNormKey(input.ocrValue, input.entityType);
  const { data: existing } = await sb
    .from("entity_resolution_corrections")
    .select("id, hit_count")
    .eq("company_id", companyId)
    .eq("entity_type", input.entityType)
    .eq("ocr_norm_key", ocrKey)
    .maybeSingle();

  if (existing?.id) {
    await sb
      .from("entity_resolution_corrections")
      .update({
        resolved_label: input.resolvedLabel,
        resolved_id: input.resolvedId ?? null,
        ocr_raw_sample: input.ocrValue.trim(),
        source: input.source,
        hit_count: (existing.hit_count ?? 1) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return;
  }

  await sb.from("entity_resolution_corrections").insert({
    company_id: companyId,
    entity_type: input.entityType,
    ocr_norm_key: ocrKey,
    ocr_raw_sample: input.ocrValue.trim(),
    resolved_label: input.resolvedLabel,
    resolved_id: input.resolvedId ?? null,
    source: input.source,
    created_by: userId,
  });
}

export async function writeResolutionCacheEntries(
  sb: SupabaseClient,
  companyId: string,
  results: readonly EntityResolutionResult[],
): Promise<void> {
  const resolved = results.filter((r) => r.status === "resolved" && r.resolvedLabel && !r.manualOverride);
  if (resolved.length === 0) return;

  const rows = resolved.map((r) => {
    const entry = buildCacheEntry({
      entityType: r.entityType,
      ocrValue: r.originalValue,
      resolvedLabel: r.resolvedLabel!,
      resolvedId: r.resolvedId,
      confidence: r.confidence,
      reason: r.reason,
      strategy: r.strategy,
      versions: r.versions,
    });
    return {
      company_id: companyId,
      entity_type: entry.entityType,
      ocr_hash: entry.ocrHash,
      resolved_label: entry.resolvedLabel,
      resolved_id: entry.resolvedId,
      confidence: entry.confidence,
      reason: entry.reason,
      strategy: entry.strategy,
      versions_json: entry.versions,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    };
  });

  await sb.from("entity_resolution_cache").upsert(rows, {
    onConflict: "company_id,entity_type,ocr_hash",
  });
}
