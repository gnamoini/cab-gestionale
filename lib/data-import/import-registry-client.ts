import type { ImportEntity } from "@/lib/data-import/core/types";
import { IMPORT_ENTITY_LABELS } from "@/lib/data-import/core/types";

/** Client-side mirror of route slugs — must stay in sync with registry.ts */
const ROUTE_SLUGS: Record<ImportEntity, string> = {
  magazzino_ricambi: "magazzino",
  clienti_anagrafica: "clienti",
  listino_ricambi: "listino",
  mezzi: "mezzi",
  preventivi: "preventivi",
  settings_fornitori: "settings-fornitori",
  settings_produttori: "settings-produttori",
  settings_categorie: "settings-categorie",
  settings_marche: "settings-marche",
  settings_addetti: "settings-addetti",
  settings_cantieri: "settings-cantieri",
  settings_utilizzatori: "settings-utilizzatori",
  settings_hierarchy_attrezzature: "settings-attrezzature",
  settings_hierarchy_telai: "settings-telai",
  lavorazioni: "lavorazioni",
  fatture_draft: "fatture",
  billing_customers: "billing-customers",
  documenti_metadata: "documenti-metadata",
  dipendenti_timesheet: "dipendenti",
};

export function routeSlugForEntity(entity: ImportEntity): string {
  return ROUTE_SLUGS[entity];
}

export function labelForImportEntity(entity: ImportEntity): string {
  return IMPORT_ENTITY_LABELS[entity];
}

export type ImportEntityClientMeta = {
  id: ImportEntity;
  routeSlug: string;
  label: string;
};

export function listImportEntityMeta(): ImportEntityClientMeta[] {
  return (Object.keys(ROUTE_SLUGS) as ImportEntity[]).map((id) => ({
    id,
    routeSlug: ROUTE_SLUGS[id],
    label: IMPORT_ENTITY_LABELS[id],
  }));
}
