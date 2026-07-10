import type { ImportEntity } from "@/lib/data-import/core/types";
import type { ExportMode } from "@/lib/data-import/core/field-schema";
import type { RecoveryCapability } from "@/lib/data-import/core/plugin-definition";
import { IMPORT_ENTITY_LABELS } from "@/lib/data-import/core/types";
import { routeSlugForEntity } from "@/lib/data-import/import-registry-client";

export type ImportExcelCapability = "active" | "export_only" | "disabled";

export type ImportWriteMode = "none" | "insert" | "update" | "upsert" | "merge";

export type AiImportCapability =
  | { enabled: false; provider: null }
  | { enabled: true; provider: "ordini_ai_modal" | "import_core" };

export type EntityCapabilities = {
  importExcel: ImportExcelCapability;
  importWriteMode: ImportWriteMode;
  exportModes: ExportMode[];
  recovery: RecoveryCapability;
  aiImport: AiImportCapability;
  note?: string;
};

const EXPORT_ALL: ExportMode[] = ["template", "importable", "backup"];
const EXPORT_STD: ExportMode[] = ["template", "importable", "backup"];
const EXPORT_NONE: ExportMode[] = [];
const AI_OFF: AiImportCapability = { enabled: false, provider: null };

/** SSOT hub — registry, UI, server auth derivano da qui. */
export const IMPORT_ENTITY_CAPABILITIES: Record<ImportEntity, EntityCapabilities> = {
  mezzi: {
    importExcel: "active",
    importWriteMode: "upsert",
    exportModes: EXPORT_STD,
    recovery: "CREATE_ONLY",
    aiImport: AI_OFF,
  },
  magazzino_ricambi: {
    importExcel: "active",
    importWriteMode: "upsert",
    exportModes: EXPORT_STD,
    recovery: "CREATE_ONLY",
    aiImport: AI_OFF,
  },
  preventivi: {
    importExcel: "active",
    importWriteMode: "upsert",
    exportModes: EXPORT_STD,
    recovery: "NONE",
    aiImport: AI_OFF,
  },
  clienti_anagrafica: {
    importExcel: "active",
    importWriteMode: "upsert",
    exportModes: EXPORT_NONE,
    recovery: "NONE",
    aiImport: AI_OFF,
  },
  listino_ricambi: {
    importExcel: "active",
    importWriteMode: "upsert",
    exportModes: EXPORT_NONE,
    recovery: "NONE",
    aiImport: AI_OFF,
  },
  lavorazioni: {
    importExcel: "export_only",
    importWriteMode: "none",
    exportModes: EXPORT_STD,
    recovery: "NONE",
    aiImport: AI_OFF,
    note: "Import Excel in una release successiva.",
  },
  fatture_draft: {
    importExcel: "export_only",
    importWriteMode: "none",
    exportModes: EXPORT_STD,
    recovery: "NONE",
    aiImport: AI_OFF,
    note: "Import Excel in una release successiva.",
  },
  ordini_fornitori: {
    importExcel: "export_only",
    importWriteMode: "none",
    exportModes: EXPORT_STD,
    recovery: "NONE",
    aiImport: { enabled: true, provider: "ordini_ai_modal" },
    note: "Usa Importa da preventivo (AI).",
  },
  settings_fornitori: {
    importExcel: "active",
    importWriteMode: "merge",
    exportModes: EXPORT_NONE,
    recovery: "NONE",
    aiImport: AI_OFF,
  },
  settings_produttori: {
    importExcel: "active",
    importWriteMode: "merge",
    exportModes: EXPORT_NONE,
    recovery: "NONE",
    aiImport: AI_OFF,
  },
  settings_categorie: {
    importExcel: "active",
    importWriteMode: "merge",
    exportModes: EXPORT_NONE,
    recovery: "NONE",
    aiImport: AI_OFF,
  },
  settings_marche: {
    importExcel: "active",
    importWriteMode: "merge",
    exportModes: EXPORT_NONE,
    recovery: "NONE",
    aiImport: AI_OFF,
  },
  settings_addetti: {
    importExcel: "active",
    importWriteMode: "merge",
    exportModes: EXPORT_NONE,
    recovery: "NONE",
    aiImport: AI_OFF,
  },
  settings_cantieri: {
    importExcel: "active",
    importWriteMode: "merge",
    exportModes: EXPORT_NONE,
    recovery: "NONE",
    aiImport: AI_OFF,
  },
  settings_utilizzatori: {
    importExcel: "active",
    importWriteMode: "merge",
    exportModes: EXPORT_NONE,
    recovery: "NONE",
    aiImport: AI_OFF,
  },
  settings_hierarchy_attrezzature: {
    importExcel: "active",
    importWriteMode: "merge",
    exportModes: EXPORT_NONE,
    recovery: "NONE",
    aiImport: AI_OFF,
  },
  settings_hierarchy_telai: {
    importExcel: "active",
    importWriteMode: "merge",
    exportModes: EXPORT_NONE,
    recovery: "NONE",
    aiImport: AI_OFF,
  },
  billing_customers: {
    importExcel: "disabled",
    importWriteMode: "none",
    exportModes: EXPORT_NONE,
    recovery: "NONE",
    aiImport: AI_OFF,
  },
  documenti_metadata: {
    importExcel: "disabled",
    importWriteMode: "none",
    exportModes: EXPORT_NONE,
    recovery: "NONE",
    aiImport: AI_OFF,
  },
  dipendenti_timesheet: {
    importExcel: "disabled",
    importWriteMode: "none",
    exportModes: EXPORT_NONE,
    recovery: "NONE",
    aiImport: AI_OFF,
  },
};

export function getEntityCapabilities(entity: ImportEntity): EntityCapabilities {
  return IMPORT_ENTITY_CAPABILITIES[entity];
}

export function isImportExcelActive(entity: ImportEntity): boolean {
  return IMPORT_ENTITY_CAPABILITIES[entity].importExcel === "active";
}

export function isImportExcelExportOnly(entity: ImportEntity): boolean {
  return IMPORT_ENTITY_CAPABILITIES[entity].importExcel === "export_only";
}

export function isImportEntityStub(entity: ImportEntity): boolean {
  const cap = IMPORT_ENTITY_CAPABILITIES[entity].importExcel;
  return cap === "disabled" || cap === "export_only";
}

export function canExportEntity(entity: ImportEntity): boolean {
  return IMPORT_ENTITY_CAPABILITIES[entity].exportModes.length > 0;
}

export function defaultImportStrategyForEntity(
  entity: ImportEntity,
): import("@/lib/data-import/core/import-plugin").ImportStrategy {
  const mode = IMPORT_ENTITY_CAPABILITIES[entity].importWriteMode;
  if (mode === "merge") return "merge";
  if (mode === "insert") return "initial";
  if (mode === "update") return "incremental";
  return "incremental";
}

/** Matrice operativa per docs / supporto. */
export function operationalStatusMatrix(): Array<{
  entity: ImportEntity;
  label: string;
  slug: string;
  templateExport: string;
  importExcel: string;
  recovery: string;
}> {
  return (Object.keys(IMPORT_ENTITY_CAPABILITIES) as ImportEntity[]).map((entity) => {
    const cap = IMPORT_ENTITY_CAPABILITIES[entity];
    const importStatus =
      cap.importExcel === "active"
        ? "PROD"
        : cap.importExcel === "export_only"
          ? "ROADMAP"
          : "N/A";
    const exportStatus = cap.exportModes.length ? "PROD" : "N/A";
    return {
      entity,
      label: IMPORT_ENTITY_LABELS[entity],
      slug: routeSlugForEntity(entity),
      templateExport: exportStatus,
      importExcel: importStatus,
      recovery: cap.recovery === "CREATE_ONLY" ? "CREATE_ONLY" : cap.recovery,
    };
  });
}
