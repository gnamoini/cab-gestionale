import "server-only";

import { cache } from "react";
import { buildPdfArtifactObjectPath } from "@/lib/pdf-artifacts/pdf-artifact-paths";
import type { PdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { normalizeStorageObjectPath } from "@/src/lib/storage/storage-paths";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type PdfArtifactRef = {
  type: PdfArtifactType;
  scopeId: string;
  dataHash: string;
  objectPath: string;
};

export function resolvePdfArtifactRef(
  type: PdfArtifactType,
  scopeId: string,
  dataHash: string,
): PdfArtifactRef {
  return {
    type,
    scopeId,
    dataHash,
    objectPath: buildPdfArtifactObjectPath(type, scopeId, dataHash),
  };
}

export async function downloadPdfArtifact(objectPath: string): Promise<Uint8Array | null> {
  const sb = await createSupabaseServerUserClient();
  const normalized = normalizeStorageObjectPath(objectPath);
  const { data, error } = await sb.storage.from(STORAGE_BUCKETS.pdfArtifacts).download(normalized);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

export async function uploadPdfArtifact(objectPath: string, bytes: Uint8Array): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const normalized = normalizeStorageObjectPath(objectPath);
  const { error } = await sb.storage.from(STORAGE_BUCKETS.pdfArtifacts).upload(normalized, bytes, {
    contentType: "application/pdf",
    upsert: true,
    cacheControl: "31536000",
  });
  if (error) throw new Error(error.message);
}

export const getCachedPdfArtifactBytes = cache(async (objectPath: string) => {
  return downloadPdfArtifact(objectPath);
});
