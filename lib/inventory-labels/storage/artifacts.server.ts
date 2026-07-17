import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeStorageObjectPath } from "@/src/lib/storage/storage-paths";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { LabelFormat } from "@/lib/inventory-labels/domain/types";

export type LabelArtifactRow = {
  id: string;
  storage_path: string;
  hash: string;
  format: string;
};

export function buildLabelArtifactPath(
  entityType: string,
  entityId: string,
  hash: string,
  format: LabelFormat,
): string {
  const safeHash = hash.trim().replace(/[^a-f0-9]/gi, "").slice(0, 32);
  return normalizeStorageObjectPath(
    `inventory-labels/${entityType}/${entityId}/${safeHash}.${format}`,
  );
}

export async function getLabelArtifactByHash(
  sb: SupabaseClient,
  input: { entityType: string; entityId: string; hash: string; format: LabelFormat },
): Promise<LabelArtifactRow | null> {
  const { data, error } = await sb
    .from("inventory_label_artifacts")
    .select("id, storage_path, hash, format")
    .eq("entity_type", input.entityType)
    .eq("entity_id", input.entityId)
    .eq("hash", input.hash)
    .eq("format", input.format)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as LabelArtifactRow | null;
}

export async function uploadLabelArtifact(input: {
  entityType: string;
  entityId: string;
  hash: string;
  format: LabelFormat;
  bytes: Uint8Array;
}): Promise<string> {
  const sb = await createSupabaseServerUserClient();
  const path = buildLabelArtifactPath(input.entityType, input.entityId, input.hash, input.format);
  const contentType =
    input.format === "png" ? "image/png" : input.format === "svg" ? "image/svg+xml" : "application/pdf";
  const { error } = await sb.storage.from(STORAGE_BUCKETS.pdfArtifacts).upload(path, input.bytes, {
    contentType,
    upsert: true,
    cacheControl: "31536000",
  });
  if (error) throw new Error(error.message);
  return path;
}

/** Cache opzionale: non blocca la consegna se lo storage non è pronto (MIME, bucket, RLS). */
export async function uploadLabelArtifactBestEffort(
  input: Parameters<typeof uploadLabelArtifact>[0],
): Promise<string | null> {
  try {
    return await uploadLabelArtifact(input);
  } catch (error) {
    console.warn(
      "[inventory-label] cache upload skipped:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export async function downloadLabelArtifact(objectPath: string): Promise<Uint8Array | null> {
  const sb = await createSupabaseServerUserClient();
  const normalized = normalizeStorageObjectPath(objectPath);
  const { data, error } = await sb.storage.from(STORAGE_BUCKETS.pdfArtifacts).download(normalized);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}
