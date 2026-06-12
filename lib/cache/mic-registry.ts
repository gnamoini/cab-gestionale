import type { MicEntityRegistryEntry, MicEntityType } from "@/lib/cache/mic-types";
import { lavorazioniDomainQueryKeys } from "@/src/services/domain/lavorazioni-domain.queries";
import { mezzoDomainQueryKeys } from "@/src/services/domain/mezzo-domain.queries";

/** Static SSOT: entity → downstream invalidation targets (no runtime graph). */
export const MIC_REGISTRY: Record<MicEntityType, MicEntityRegistryEntry> = {
  lavorazione: {
    operationalDomain: "lavorazioni",
    extraQueryKeys: (id) => [
      lavorazioniDomainQueryKeys.base(id),
      lavorazioniDomainQueryKeys.lavorazionePdfs(id),
      lavorazioniDomainQueryKeys.schede(id),
    ],
    pdfScopes: [
      { type: "lavorazioni-in-corso", scopeId: "global" },
      { type: "scheda-ingresso", scopeId: (entityId) => entityId },
      { type: "scheda-lavorazioni", scopeId: (entityId) => entityId },
      { type: "scheda-ricambi", scopeId: (entityId) => entityId },
    ],
    reportRefresh: true,
    versionBump: true,
  },
  documento: {
    operationalDomain: "documenti",
    pdfScopes: [],
    reportRefresh: false,
    versionBump: true,
  },
  mezzo: {
    operationalDomain: "mezzi",
    extraQueryKeys: (id) => [mezzoDomainQueryKeys.base(id)],
    linkedOperationalTables: ["scheda_lavorazione"],
    pdfScopes: [{ type: "report-bundle", scopeId: "global" }],
    reportRefresh: true,
    versionBump: true,
  },
  report: {
    operationalDomain: "report",
    pdfScopes: [{ type: "report-bundle", scopeId: "global" }],
    reportRefresh: true,
    versionBump: false,
  },
  settings: {
    useRuntimeTruth: "appSettingsChanged",
    pdfScopes: [
      { type: "report-bundle", scopeId: "global" },
      { type: "lavorazioni-in-corso", scopeId: "global" },
    ],
    reportRefresh: true,
    versionBump: false,
  },
};
