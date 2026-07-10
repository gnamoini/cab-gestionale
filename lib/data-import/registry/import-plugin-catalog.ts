import type { CapabilityConsistencyPlugin } from "@/lib/data-import/core/capability-consistency";
import type { ImportEntity } from "@/lib/data-import/core/types";

/** Manifesto plugin legacy (no server-only) — allineato a import-export-registry bootstrap. */
export const IMPORT_PLUGIN_CATALOG: CapabilityConsistencyPlugin[] = [
  { id: "magazzino_ricambi", status: "active", supportedStrategies: ["initial", "incremental", "replace"] },
  { id: "clienti_anagrafica", status: "active", supportedStrategies: ["initial", "incremental"] },
  { id: "listino_ricambi", status: "active", supportedStrategies: ["sync", "incremental", "initial"] },
  { id: "mezzi", status: "active", supportedStrategies: ["initial", "incremental"] },
  { id: "preventivi", status: "active", supportedStrategies: ["initial", "incremental"] },
  { id: "settings_hierarchy_attrezzature", status: "active", supportedStrategies: ["merge", "initial"] },
  { id: "settings_hierarchy_telai", status: "active", supportedStrategies: ["merge", "initial"] },
  { id: "settings_fornitori", status: "active", supportedStrategies: ["merge", "replace", "initial"] },
  { id: "settings_produttori", status: "active", supportedStrategies: ["merge", "replace", "initial"] },
  { id: "settings_categorie", status: "active", supportedStrategies: ["merge", "replace", "initial"] },
  { id: "settings_marche", status: "active", supportedStrategies: ["merge", "replace", "initial"] },
  { id: "settings_addetti", status: "active", supportedStrategies: ["merge", "replace", "initial"] },
  { id: "settings_cantieri", status: "active", supportedStrategies: ["merge", "replace", "initial"] },
  { id: "settings_utilizzatori", status: "active", supportedStrategies: ["merge", "replace", "initial"] },
  { id: "lavorazioni", status: "stub", supportedStrategies: ["initial"] },
  { id: "fatture_draft", status: "stub", supportedStrategies: ["initial"] },
  { id: "billing_customers", status: "stub", supportedStrategies: ["initial"] },
  { id: "documenti_metadata", status: "stub", supportedStrategies: ["initial"] },
  { id: "dipendenti_timesheet", status: "stub", supportedStrategies: ["initial"] },
  { id: "ordini_fornitori", status: "stub", supportedStrategies: ["initial"] },
];

/** Entità con snapshotProvider v3 (export importable/backup). */
export const V3_SNAPSHOT_ENTITIES = new Set<ImportEntity>([
  "mezzi",
  "magazzino_ricambi",
  "preventivi",
  "lavorazioni",
  "fatture_draft",
  "ordini_fornitori",
]);
