import "server-only";

import { apiKeyFingerprint } from "@/lib/ai/runtime/key-crypto";
import { readRuntimeBootstrapKeys } from "@/lib/ai/runtime/env-reader";
import { inspectApiKeyFormat } from "@/lib/ai/runtime/key-validation";
import {
  disableProviderKey,
  ingestProviderKey,
} from "@/lib/ai/runtime/key-ingest";
import { resolveIngestMode } from "@/lib/ai/runtime/ingest-mode";
import { invalidateKeyCache } from "@/lib/ai/runtime/key-cache";
import type { AiProviderKeyRow, SyncPreviewResult } from "@/lib/ai/runtime/types";
import { createSupabaseServerServiceClient } from "@/src/lib/supabase/server-service-client";

export type SyncRuntimeConfigOptions = {
  dryRun?: boolean;
  actorId?: string | null;
};

export type SyncRuntimeConfigResult = SyncPreviewResult & {
  candidates: number;
  created: number;
  updated: number;
  disabled: number;
  warnings: string[];
};

async function loadAllDbKeys(): Promise<AiProviderKeyRow[]> {
  const sb = createSupabaseServerServiceClient();
  const { data, error } = await sb.from("ai_provider_keys").select("*");
  if (error) throw error;
  return (data ?? []) as AiProviderKeyRow[];
}

function readBootstrapWithConfidence(): {
  candidates: ReturnType<typeof readRuntimeBootstrapKeys>;
  syncConfidence: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  try {
    const candidates = readRuntimeBootstrapKeys();
    return { candidates, syncConfidence: true, warnings };
  } catch (e) {
    warnings.push(e instanceof Error ? e.message : "env scan failed");
    return { candidates: [], syncConfidence: false, warnings };
  }
}

/** Full env→DB sync with confidence guard and dry-run preview. */
export async function syncRuntimeConfigToDatabase(
  options?: SyncRuntimeConfigOptions,
): Promise<SyncRuntimeConfigResult> {
  const dryRun = options?.dryRun ?? false;
  const { candidates, syncConfidence, warnings } = readBootstrapWithConfidence();

  const wouldCreate: string[] = [];
  const wouldUpdate: string[] = [];
  const wouldDisable: string[] = [];

  const dbKeys = await loadAllDbKeys();
  const envFingerprints = new Set(candidates.map((c) => apiKeyFingerprint(c.apiKey)));

  let created = 0;
  let updated = 0;
  let disabled = 0;

  if (dryRun) {
    for (const candidate of candidates) {
      const format = inspectApiKeyFormat(candidate.apiKey);
      if (!format.valid) {
        warnings.push(`${candidate.slot}: invalid format — ${format.issues.join(", ")}`);
        continue;
      }
      const fp = apiKeyFingerprint(candidate.apiKey);
      const existing = dbKeys.find((r) => r.key_fingerprint === fp);
      const mode = resolveIngestMode(fp, existing);
      if (!existing) {
        wouldCreate.push(candidate.slot);
      } else if (mode === "EXISTING") {
        wouldUpdate.push(candidate.slot);
      } else if (mode === "RECOVERY") {
        wouldUpdate.push(`${candidate.slot}:recovery`);
      }
    }
  } else {
    for (const candidate of candidates) {
      const fp = apiKeyFingerprint(candidate.apiKey);
      const existing = dbKeys.find((r) => r.key_fingerprint === fp);
      const mode = resolveIngestMode(fp, existing);

      if (!existing) {
        wouldCreate.push(candidate.slot);
      } else if (mode === "EXISTING") {
        wouldUpdate.push(candidate.slot);
      } else if (mode === "RECOVERY") {
        wouldUpdate.push(`${candidate.slot}:recovery`);
      }

      const result = await ingestProviderKey({
        provider: candidate.provider,
        slot: candidate.slot,
        apiKey: candidate.apiKey,
        priority: candidate.priority,
        source: candidate.source,
        managedBy: candidate.managedBy,
        mode,
        actorId: options?.actorId,
        envName: candidate.envName,
        dryRun: false,
        requireProviderTest: mode === "NEW" || mode === "RECOVERY",
      });

      if (!result.ok) {
        if (result.warning) {
          warnings.push(`${candidate.slot}: ${result.reason}`);
        } else {
          warnings.push(`${candidate.slot}: skip — ${result.reason}`);
        }
        continue;
      }

      if (result.action === "created") created += 1;
      if (result.action === "updated") updated += 1;
    }
  }

  if (syncConfidence) {
    for (const row of dbKeys) {
      if (row.managed_by !== "runtime_sync") continue;
      if (!row.enabled) continue;
      if (envFingerprints.has(row.key_fingerprint)) continue;
      wouldDisable.push(row.slot);
      if (!dryRun) {
        await disableProviderKey({
          id: row.id,
          disabledReason: "env_removed",
          actorId: options?.actorId,
        });
        disabled += 1;
      }
    }
  } else {
    warnings.push("sync_confidence=false — nessuna chiave disabilitata");
  }

  if (!dryRun) {
    invalidateKeyCache("google");
  }

  return {
    syncConfidence,
    candidates: candidates.length,
    wouldCreate,
    wouldUpdate,
    wouldDisable,
    warnings,
    created,
    updated,
    disabled,
  };
}

/** @deprecated Use syncRuntimeConfigToDatabase */
export async function bootstrapSyncLegacyKeysIfEmpty(actorId?: string | null): Promise<number> {
  const dbKeys = await loadAllDbKeys();
  if (dbKeys.length > 0) return 0;
  const result = await syncRuntimeConfigToDatabase({ actorId });
  return result.created + result.updated;
}
