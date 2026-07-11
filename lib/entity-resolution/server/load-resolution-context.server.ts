import "server-only";

import {
  createInMemoryKnownCorrectionsStore,
  emptyKnownCorrectionsStore,
} from "@/lib/entity-resolution/known-corrections";
import {
  createInMemoryResolutionCacheStore,
  emptyResolutionCacheStore,
} from "@/lib/entity-resolution/resolution-cache";
import {
  ENTITY_RESOLUTION_ALIASES_KEY,
  ENTITY_RESOLUTION_ALIASES_MODULE,
  parseEntityAliasesPayload,
} from "@/lib/entity-resolution/settings-aliases";
import type { ResolutionRuntimeContext } from "@/lib/entity-resolution/resolve-capture-graph";
import type { ResolutionDataSources } from "@/lib/entity-resolution/build-resolution-context";
import { resolveCabAppSettingsFromRows } from "@/src/lib/app-settings/resolve-from-rows";
import type { AppSettingRow } from "@/src/types/supabase-tables";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { llmPickEntityCandidate } from "@/lib/entity-resolution/entity-resolution-llm";

export async function loadEntityResolutionAliases(
  sb: SupabaseClient,
): Promise<ReturnType<typeof parseEntityAliasesPayload>> {
  const { data } = await sb
    .from("app_settings")
    .select("value")
    .eq("module", ENTITY_RESOLUTION_ALIASES_MODULE)
    .eq("key", ENTITY_RESOLUTION_ALIASES_KEY)
    .maybeSingle();
  return parseEntityAliasesPayload(data?.value);
}

export async function loadKnownCorrectionsStore(sb: SupabaseClient, companyId: string) {
  const { data } = await sb
    .from("entity_resolution_corrections")
    .select("entity_type, ocr_norm_key, ocr_raw_sample, resolved_label, resolved_id, hit_count")
    .eq("company_id", companyId)
    .limit(5000);
  const rows = (data ?? []).map((r) => ({
    entityType: r.entity_type as import("@/lib/entity-resolution/entity-resolution-types").EntityType,
    ocrNormKey: r.ocr_norm_key,
    ocrRawSample: r.ocr_raw_sample,
    resolvedLabel: r.resolved_label,
    resolvedId: r.resolved_id,
    hitCount: r.hit_count ?? 1,
  }));
  return rows.length > 0 ? createInMemoryKnownCorrectionsStore(rows) : emptyKnownCorrectionsStore();
}

export async function loadResolutionCacheStore(sb: SupabaseClient, companyId: string) {
  const { data } = await sb
    .from("entity_resolution_cache")
    .select("entity_type, ocr_hash, resolved_label, resolved_id, confidence, reason, strategy, versions_json")
    .eq("company_id", companyId)
    .gt("expires_at", new Date().toISOString())
    .limit(10000);
  const rows = (data ?? []).map((r) => ({
    entityType: r.entity_type as import("@/lib/entity-resolution/entity-resolution-types").EntityType,
    ocrHash: r.ocr_hash,
    resolvedLabel: r.resolved_label,
    resolvedId: r.resolved_id,
    confidence: Number(r.confidence),
    reason: r.reason as import("@/lib/entity-resolution/entity-resolution-types").ResolutionReason,
    strategy: r.strategy as import("@/lib/entity-resolution/entity-resolution-types").ResolutionStrategy,
    versions: (r.versions_json ?? {}) as import("@/lib/entity-resolution/entity-resolution-types").ResolutionVersions,
  }));
  return rows.length > 0 ? createInMemoryResolutionCacheStore(rows) : emptyResolutionCacheStore();
}

export async function loadResolutionRuntimeContext(
  sb: SupabaseClient,
  companyId: string,
  input: {
    settingsRows?: AppSettingRow[];
    magazzino?: readonly RicambioMagazzino[];
    mezzi?: readonly MezzoGestito[];
  } = {},
): Promise<ResolutionRuntimeContext> {
  let settingsRows = input.settingsRows;
  if (!settingsRows) {
    const { data } = await sb.from("app_settings").select("*");
    settingsRows = (data ?? []) as AppSettingRow[];
  }
  const settings = resolveCabAppSettingsFromRows(settingsRows);
  const sources: ResolutionDataSources = {
    settings,
    magazzino: input.magazzino ?? [],
    mezzi: input.mezzi ?? [],
  };
  const [aliases, corrections, cache] = await Promise.all([
    loadEntityResolutionAliases(sb),
    loadKnownCorrectionsStore(sb, companyId),
    loadResolutionCacheStore(sb, companyId),
  ]);
  return {
    sources,
    aliases,
    corrections,
    cache,
    llmResolver: llmPickEntityCandidate,
  };
}
