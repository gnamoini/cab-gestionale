import { normalizeStorageObjectPath } from "@/src/lib/storage/storage-paths";
import type { PdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";

export function sanitizePdfArtifactScopeId(scopeId: string): string {
  return scopeId.trim().replace(/[/\\?%*:|"<>]/g, "-").slice(0, 120) || "global";
}

/** Prefisso cartella artifact (`type/scope`) senza hash né estensione. */
export function buildPdfArtifactScopePrefix(type: PdfArtifactType, scopeId: string): string {
  return normalizeStorageObjectPath(`${type}/${sanitizePdfArtifactScopeId(scopeId)}`);
}

/** Path oggetto nel bucket `pdf-artifacts` (senza nome bucket). */
export function buildPdfArtifactObjectPath(
  type: PdfArtifactType,
  scopeId: string,
  dataHash: string,
): string {
  const safeHash = dataHash.trim().replace(/[^a-f0-9]/gi, "").slice(0, 32);
  return normalizeStorageObjectPath(`${buildPdfArtifactScopePrefix(type, scopeId)}/${safeHash}.pdf`);
}
