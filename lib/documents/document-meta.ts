export type DocumentIntelligenceMeta = {
  contentHash?: string;
  thumbnailKey?: string;
  semanticClass?: string;
};

export function readDocumentIntelligenceMeta(meta: Record<string, unknown> | null | undefined): DocumentIntelligenceMeta {
  const m = meta ?? {};
  return {
    contentHash: typeof m.contentHash === "string" ? m.contentHash.trim() : undefined,
    thumbnailKey: typeof m.thumbnailKey === "string" ? m.thumbnailKey.trim() : undefined,
    semanticClass: typeof m.semanticClass === "string" ? m.semanticClass.trim() : undefined,
  };
}

export function mergeDocumentIntelligenceMeta(
  meta: Record<string, unknown> | null | undefined,
  patch: DocumentIntelligenceMeta,
): Record<string, unknown> {
  const base = meta && typeof meta === "object" ? { ...meta } : {};
  if (patch.contentHash) base.contentHash = patch.contentHash;
  if (patch.thumbnailKey) base.thumbnailKey = patch.thumbnailKey;
  if (patch.semanticClass) base.semanticClass = patch.semanticClass;
  return base;
}
