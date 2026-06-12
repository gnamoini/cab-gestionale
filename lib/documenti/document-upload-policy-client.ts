"use client";

import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import type { LavorazioneDocumentStorageTipo } from "@/src/lib/storage/storage-paths";

export type ArchiveUploadPolicyResult =
  | {
      ok: true;
      bucket: typeof STORAGE_BUCKETS.documenti;
      path: string;
      deduplicated: boolean;
      contentHash?: string;
      semanticClass?: string;
    }
  | { ok: false; message: string };

export type UploadPolicyResult =
  | { ok: true; bucket: typeof STORAGE_BUCKETS.documenti; path: string }
  | { ok: false; message: string };

export async function requestArchiveDocumentUploadPolicy(input: {
  fileName: string;
  fileSize: number;
  mimeType: string;
  contentHash?: string;
  categoria?: string;
}): Promise<ArchiveUploadPolicyResult> {
  const res = await fetch("/api/documents/upload-policy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "archive",
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      contentHash: input.contentHash,
      categoria: input.categoria,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    bucket?: string;
    path?: string;
    deduplicated?: boolean;
    contentHash?: string;
    semanticClass?: string;
  };
  if (!res.ok) return { ok: false, message: data.error ?? "Upload non autorizzato." };
  if (!data.path) return { ok: false, message: "Risposta upload non valida." };
  return {
    ok: true,
    bucket: STORAGE_BUCKETS.documenti,
    path: data.path,
    deduplicated: data.deduplicated === true,
    contentHash: data.contentHash,
    semanticClass: data.semanticClass,
  };
}

export async function requestLavorazioneDocumentUploadPolicy(input: {
  lavorazioneId: string;
  tipo: LavorazioneDocumentStorageTipo;
  fileName: string;
  fileSize: number;
  mimeType: string;
}): Promise<UploadPolicyResult> {
  const res = await fetch("/api/documents/upload-policy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "lavorazione",
      lavorazioneId: input.lavorazioneId,
      tipo: input.tipo,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; path?: string };
  if (!res.ok) return { ok: false, message: data.error ?? "Upload non autorizzato." };
  if (!data.path) return { ok: false, message: "Risposta upload non valida." };
  return { ok: true, bucket: STORAGE_BUCKETS.documenti, path: data.path };
}
