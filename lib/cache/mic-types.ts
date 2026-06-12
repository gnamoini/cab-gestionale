import type { PdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import type { OperationalTruthDomain } from "@/src/lib/runtime/truth-layer/invalidate-operational-truth";

export const MIC_ENTITY_TYPES = ["lavorazione", "documento", "mezzo", "report", "settings"] as const;

export type MicEntityType = (typeof MIC_ENTITY_TYPES)[number];

export type MicScope = "full" | "reactQuery" | "assets" | "report";

export type MicPdfScopeEntry = {
  type: PdfArtifactType;
  scopeId: string | ((entityId: string) => string);
};

export type MicEntityRegistryEntry = {
  operationalDomain?: OperationalTruthDomain;
  useRuntimeTruth?: "appSettingsChanged";
  extraQueryKeys?: (entityId: string) => readonly (readonly unknown[])[];
  /** Tabelle aggiuntive da includere nel dispatch operational truth. */
  linkedOperationalTables?: readonly string[];
  pdfScopes: MicPdfScopeEntry[];
  reportRefresh: boolean;
  versionBump: boolean;
};

export function isMicEntityType(value: string): value is MicEntityType {
  return (MIC_ENTITY_TYPES as readonly string[]).includes(value);
}

export function micScopeIncludesReactQuery(scope: MicScope): boolean {
  return scope === "full" || scope === "reactQuery";
}

export function micScopeIncludesAssets(scope: MicScope): boolean {
  return scope === "full" || scope === "assets";
}

export function micScopeIncludesReport(scope: MicScope): boolean {
  return scope === "full" || scope === "report";
}

export function micScopeIncludesVersion(scope: MicScope): boolean {
  return scope === "full" || scope === "assets";
}
