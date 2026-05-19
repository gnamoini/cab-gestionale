import { isImageStorageScope, type ImageStorageScope } from "@/src/lib/storage/storage-config";

const INVALID_PATH_CHARS = /[/\\?%*:|"<>]/g;

export function assertValidRecordId(recordId: string, label = "record"): asserts recordId is string {
  const id = recordId?.trim();
  if (!id) {
    throw new Error(`Identificativo ${label} mancante: impossibile caricare file.`);
  }
}

export function sanitizeStorageFileName(name: string, fallback = "file"): string {
  const base = name
    .trim()
    .replace(INVALID_PATH_CHARS, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (base || fallback).slice(0, 180);
}

export function normalizeStorageObjectPath(path: string): string {
  return path
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
}

export function imageStoragePrefix(scope: ImageStorageScope, recordId: string): string {
  assertValidRecordId(recordId, scope);
  if (!isImageStorageScope(scope)) {
    throw new Error("Ambito immagine non valido.");
  }
  return normalizeStorageObjectPath(`${scope}/${recordId.trim()}`);
}

export function buildImageStoragePath(scope: ImageStorageScope, recordId: string, fileName: string): string {
  const safeName = sanitizeStorageFileName(fileName, "image.jpg");
  return normalizeStorageObjectPath(`${imageStoragePrefix(scope, recordId)}/${safeName}`);
}

export function buildDocumentoStoragePath(fileName: string): string {
  const id = crypto.randomUUID();
  const safeName = sanitizeStorageFileName(fileName, "documento");
  return normalizeStorageObjectPath(`${id}/${safeName}`);
}
