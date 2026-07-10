import type { ImportEntity } from "@/lib/data-import/core/types";

export type ImportPermissionContext = {
  magazzinoWrite: boolean;
  magazzinoAdmin: boolean;
  manageSettings: boolean;
  moduleWrite?: Partial<Record<string, boolean>>;
};

const MODULE_ENTITIES: Partial<Record<ImportEntity, string>> = {
  magazzino_ricambi: "magazzino",
  listino_ricambi: "magazzino",
  mezzi: "mezzi",
  preventivi: "preventivi",
  ordini_fornitori: "preventivi",
  lavorazioni: "lavorazioni",
  fatture_draft: "fatturazione",
  billing_customers: "fatturazione",
  documenti_metadata: "documenti",
  dipendenti_timesheet: "dipendenti",
};

const SETTINGS_ENTITIES = new Set<ImportEntity>([
  "clienti_anagrafica",
  "settings_fornitori",
  "settings_produttori",
  "settings_categorie",
  "settings_marche",
  "settings_addetti",
  "settings_cantieri",
  "settings_utilizzatori",
  "settings_hierarchy_attrezzature",
  "settings_hierarchy_telai",
]);

export { isImportEntityStub, isImportExcelActive } from "@/lib/data-import/import-capabilities";

export function canImportEntity(ctx: ImportPermissionContext, entity: ImportEntity): boolean {
  if (SETTINGS_ENTITIES.has(entity)) return ctx.manageSettings;
  const mod = MODULE_ENTITIES[entity];
  if (!mod) return false;
  if (ctx.moduleWrite?.[mod] != null) return Boolean(ctx.moduleWrite[mod]);
  if (mod === "magazzino") return ctx.magazzinoWrite;
  return ctx.magazzinoWrite || ctx.manageSettings;
}

export function canImportOverwrite(ctx: ImportPermissionContext, entity: ImportEntity): boolean {
  if (entity === "magazzino_ricambi" || entity === "listino_ricambi") return ctx.magazzinoAdmin;
  return canImportEntity(ctx, entity);
}

export function canDownloadImportTemplate(ctx: ImportPermissionContext, entity: ImportEntity): boolean {
  if (entity === "magazzino_ricambi" || entity === "listino_ricambi") {
    return ctx.magazzinoWrite || ctx.magazzinoAdmin;
  }
  return canImportEntity(ctx, entity);
}
