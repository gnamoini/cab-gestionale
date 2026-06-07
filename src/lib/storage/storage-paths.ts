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

export const LAVORAZIONE_DOCUMENT_FILE_NAMES = {
  preventivo_upload: "preventivo.pdf",
  ddt: "ddt.pdf",
} as const;

export type LavorazioneDocumentStorageTipo = keyof typeof LAVORAZIONE_DOCUMENT_FILE_NAMES;

export function buildLavorazioneDocumentStoragePath(
  lavorazioneId: string,
  tipo: LavorazioneDocumentStorageTipo,
): string {
  assertValidRecordId(lavorazioneId, "lavorazione");
  return normalizeStorageObjectPath(`lavorazioni/${lavorazioneId.trim()}/${LAVORAZIONE_DOCUMENT_FILE_NAMES[tipo]}`);
}

/** Path SSOT logo branding globale (`images` bucket). */
export function buildBrandingLogoStoragePath(extension: "png" | "webp" | "jpeg" | "jpg" | "svg"): string {
  const ext = extension === "jpg" ? "jpeg" : extension;
  const fileName = ext === "jpeg" ? "app-logo.jpg" : `app-logo.${ext}`;
  return normalizeStorageObjectPath(`branding/${fileName}`);
}

export const BRANDING_LOGO_STORAGE_PREFIX = "branding/" as const;
