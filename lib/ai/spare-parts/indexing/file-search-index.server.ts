import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readSparePartsEmbeddingModel } from "@/lib/ai/spare-parts/config";
import { loadActiveKeys } from "@/lib/ai/runtime/config-store";
import { logAiObs } from "@/lib/ai/runtime/observability";

export type FileSearchIndexResult = {
  storeName: string;
  fileName: string;
  operationName?: string;
};

/** ponytail: dynamic import keeps @google/genai out of unrelated bundles */
async function getGenAiClient(apiKey: string) {
  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({ apiKey });
}

export async function resolveFileSearchApiKey(): Promise<string | null> {
  const loaded = await loadActiveKeys("google");
  const first = loaded.keys[0];
  return first?.apiKey ?? null;
}

export async function ensureFileSearchStore(displayName: string): Promise<string> {
  const apiKey = await resolveFileSearchApiKey();
  if (!apiKey) throw new Error("AI_CONFIG_MISSING");

  const client = await getGenAiClient(apiKey);
  const embeddingModel = readSparePartsEmbeddingModel();

  const store = await client.fileSearchStores.create({
    config: {
      displayName,
      embeddingModel,
    },
  });

  if (!store.name) throw new Error("FILE_SEARCH_STORE_CREATE_FAILED");
  logAiObs("AI_RESPONSE", { operation: "spare_parts_file_search_store_create", storeName: store.name });
  return store.name;
}

export async function uploadDocumentToFileSearch(input: {
  storeName: string;
  fileBytes: Buffer;
  mimeType: string;
  displayName: string;
  customMetadata?: Record<string, string>;
}): Promise<FileSearchIndexResult> {
  const apiKey = await resolveFileSearchApiKey();
  if (!apiKey) throw new Error("AI_CONFIG_MISSING");

  const client = await getGenAiClient(apiKey);
  const blob = new Blob([new Uint8Array(input.fileBytes)], { type: input.mimeType });

  let operation = await client.fileSearchStores.uploadToFileSearchStore({
    fileSearchStoreName: input.storeName,
    file: blob,
    config: {
      displayName: input.displayName,
      customMetadata: input.customMetadata
        ? Object.entries(input.customMetadata).map(([key, stringValue]) => ({ key, stringValue }))
        : undefined,
    },
  });

  const deadline = Date.now() + 120_000;
  while (!operation.done && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    operation = await client.operations.get({ operation });
  }

  if (!operation.done) throw new Error("FILE_SEARCH_UPLOAD_TIMEOUT");

  const fileName =
    (operation.response as { name?: string } | undefined)?.name ??
    (operation.metadata as { file?: { name?: string } } | undefined)?.file?.name;

  return {
    storeName: input.storeName,
    fileName: fileName ?? "",
    operationName: operation.name,
  };
}

export function contentHashFromBuffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export async function loadDocumentBytes(
  sb: SupabaseClient,
  documentoId: string,
): Promise<{ bytes: Buffer; mimeType: string; meta: Record<string, unknown> } | null> {
  const { data: doc, error } = await sb
    .from("documenti")
    .select("url_file, meta, categoria, marca, modello")
    .eq("id", documentoId)
    .maybeSingle();
  if (error || !doc?.url_file) return null;

  const { storageCreateSignedUrl } = await import("@/src/services/storage.service");
  const { STORAGE_BUCKETS } = await import("@/src/lib/storage/storage-config");
  const signed = await storageCreateSignedUrl(STORAGE_BUCKETS.documenti, doc.url_file as string, 300);
  const res = await fetch(signed);
  if (!res.ok) return null;
  const arrayBuf = await res.arrayBuffer();
  const meta = (doc.meta as Record<string, unknown>) ?? {};
  const mimeType =
    (typeof meta.mimeType === "string" && meta.mimeType) ||
    res.headers.get("content-type") ||
    "application/pdf";

  return { bytes: Buffer.from(arrayBuf), mimeType, meta };
}
