import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  readFileSearchStoreName,
  readFileSearchUploadTimeoutMs,
  readSparePartsEmbeddingModel,
} from "@/lib/ai/spare-parts/config";
import {
  assertFileSearchUploadSucceeded,
  computeFileSearchUploadTimeoutMs,
  extractFileSearchUploadFileName,
  isFileSearchUploadComplete,
  type FileSearchOperationShape,
} from "@/lib/ai/spare-parts/indexing/file-search-upload-operation";
import { loadActiveKeys } from "@/lib/ai/runtime/config-store";
import { logAiObs } from "@/lib/ai/runtime/observability";
import { documentoStoragePathFromStored } from "@/lib/documenti/storage-path-from-stored";
import { downloadDocumentoBytesWithClient } from "@/lib/documents/document-delivery-storage.server";

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
  const configured = readFileSearchStoreName();
  if (configured) return configured;

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

async function waitForFileSearchUpload(
  client: Awaited<ReturnType<typeof getGenAiClient>>,
  initial: FileSearchOperationShape,
  timeoutMs: number,
): Promise<FileSearchOperationShape> {
  let operation: FileSearchOperationShape = initial;
  if (isFileSearchUploadComplete(operation)) {
    assertFileSearchUploadSucceeded(operation);
    return operation;
  }

  const deadline = Date.now() + timeoutMs;
  let pollIntervalMs = 3_000;
  let polls = 0;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    polls += 1;
    const polled = await client.operations.get({
      operation: operation as Awaited<ReturnType<typeof getGenAiClient>>["operations"]["get"] extends (
        arg: { operation: infer O },
      ) => unknown
        ? O
        : never,
    });
    operation = polled as FileSearchOperationShape;
    logAiObs("AI_RESPONSE", {
      operation: "spare_parts_file_search_upload_poll",
      poll: polls,
      done: operation.done,
      hasResponse: Boolean(operation.response?.documentName || operation.response?.name),
    });

    if (isFileSearchUploadComplete(operation)) {
      assertFileSearchUploadSucceeded(operation);
      return operation;
    }

    pollIntervalMs = Math.min(30_000, Math.round(pollIntervalMs * 1.4));
  }

  throw new Error("FILE_SEARCH_UPLOAD_TIMEOUT");
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
  const timeoutMs = computeFileSearchUploadTimeoutMs(input.fileBytes.length, readFileSearchUploadTimeoutMs());

  let operation = (await client.fileSearchStores.uploadToFileSearchStore({
    fileSearchStoreName: input.storeName,
    file: blob,
    config: {
      displayName: input.displayName,
      customMetadata: input.customMetadata
        ? Object.entries(input.customMetadata).map(([key, stringValue]) => ({ key, stringValue }))
        : undefined,
    },
  })) as FileSearchOperationShape;

  operation = await waitForFileSearchUpload(client, operation, timeoutMs);

  const fileName = extractFileSearchUploadFileName(operation);

  return {
    storeName: input.storeName,
    fileName,
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

  const path = documentoStoragePathFromStored(doc.url_file as string);
  if (!path) return null;

  const bytes = await downloadDocumentoBytesWithClient(sb, path);
  if (!bytes) return null;

  const meta = (doc.meta as Record<string, unknown>) ?? {};
  const mimeType =
    (typeof meta.mimeType === "string" && meta.mimeType) || "application/pdf";

  return { bytes: Buffer.from(bytes), mimeType, meta };
}
