export type DocumentSparePartsDocumentKind =
  | "spare_parts_catalog"
  | "price_list"
  | "oem_manual"
  | "exploded_view"
  | "other";

export type DocumentSparePartsSourceType = "oem" | "distributor" | "internal";

export type DocumentSparePartsMeta = {
  aiSparePartsEnabled?: boolean;
  aiPriceEnabled?: boolean;
  aiDocumentKind?: DocumentSparePartsDocumentKind;
  aiSourceType?: DocumentSparePartsSourceType;
  aiYear?: string;
  aiLanguage?: string;
};

const KINDS = new Set<DocumentSparePartsDocumentKind>([
  "spare_parts_catalog",
  "price_list",
  "oem_manual",
  "exploded_view",
  "other",
]);

const SOURCE_TYPES = new Set<DocumentSparePartsSourceType>(["oem", "distributor", "internal"]);

export function readDocumentSparePartsMeta(meta: Record<string, unknown> | null | undefined): DocumentSparePartsMeta {
  const m = meta ?? {};
  const kind = typeof m.aiDocumentKind === "string" && KINDS.has(m.aiDocumentKind as DocumentSparePartsDocumentKind)
    ? (m.aiDocumentKind as DocumentSparePartsDocumentKind)
    : undefined;
  const source =
    typeof m.aiSourceType === "string" && SOURCE_TYPES.has(m.aiSourceType as DocumentSparePartsSourceType)
      ? (m.aiSourceType as DocumentSparePartsSourceType)
      : undefined;
  return {
    aiSparePartsEnabled: m.aiSparePartsEnabled === true,
    aiPriceEnabled: m.aiPriceEnabled === true,
    aiDocumentKind: kind,
    aiSourceType: source,
    aiYear: typeof m.aiYear === "string" ? m.aiYear.trim() : undefined,
    aiLanguage: typeof m.aiLanguage === "string" ? m.aiLanguage.trim() : undefined,
  };
}

export function mergeDocumentSparePartsMeta(
  meta: Record<string, unknown> | null | undefined,
  patch: DocumentSparePartsMeta,
): Record<string, unknown> {
  const base = meta && typeof meta === "object" ? { ...meta } : {};
  if (patch.aiSparePartsEnabled !== undefined) base.aiSparePartsEnabled = patch.aiSparePartsEnabled;
  if (patch.aiPriceEnabled !== undefined) base.aiPriceEnabled = patch.aiPriceEnabled;
  if (patch.aiDocumentKind) base.aiDocumentKind = patch.aiDocumentKind;
  if (patch.aiSourceType) base.aiSourceType = patch.aiSourceType;
  if (patch.aiYear) base.aiYear = patch.aiYear;
  if (patch.aiLanguage) base.aiLanguage = patch.aiLanguage;
  if (patch.aiSparePartsEnabled === false) {
    delete base.aiDocumentKind;
    delete base.aiSourceType;
    delete base.aiYear;
    delete base.aiLanguage;
  }
  return base;
}

export type DocumentAiIndexBadgeState = {
  fileSearch: "ready" | "processing" | "failed" | "disabled" | "none";
  aiCatalog: "ready" | "processing" | "failed" | "disabled" | "none";
  exploded: "ready" | "partial" | "none" | "disabled";
};

export function deriveDocumentAiIndexBadges(input: {
  aiEnabled: boolean;
  status?: string | null;
  understandingStatus?: string | null;
  indexQuality?: string | null;
  capabilities?: Record<string, boolean> | null;
}): DocumentAiIndexBadgeState {
  if (!input.aiEnabled) {
    return { fileSearch: "disabled", aiCatalog: "disabled", exploded: "disabled" };
  }

  const fsStatus = input.status ?? "none";
  const fileSearch =
    fsStatus === "indexed"
      ? "ready"
      : fsStatus === "processing" || fsStatus === "pending"
        ? "processing"
        : fsStatus === "failed"
          ? "failed"
          : "none";

  const us = input.understandingStatus ?? "none";
  const aiCatalog =
    us === "ready"
      ? "ready"
      : us === "processing" || us === "pending"
        ? "processing"
        : us === "failed"
          ? "failed"
          : fileSearch === "ready"
            ? "processing"
            : "none";

  const caps = input.capabilities ?? {};
  const exploded =
    caps.exploded_views === true
      ? input.indexQuality === "low"
        ? "partial"
        : "ready"
      : aiCatalog === "ready"
        ? "none"
        : "none";

  return { fileSearch, aiCatalog, exploded };
}
