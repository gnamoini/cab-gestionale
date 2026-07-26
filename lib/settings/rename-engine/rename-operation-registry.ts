import type { SettingsRenameKind } from "@/lib/settings/settings-rename-types";
import type { RenameOperation } from "@/lib/settings/rename-engine/types";

/** SSOT server registry — operationIds per kind. No arbitrary SQL in plan_json. */
export const RENAME_OPERATIONS: Record<string, RenameOperation> = {
  "cliente.mezzi.cliente": {
    id: "cliente.mezzi.cliente",
    action: "replace_column",
    table: "mezzi",
    column: "cliente",
    filter: { columnEq: {} },
    policy: "live",
  },
  "cliente.preventivi.cliente": {
    id: "cliente.preventivi.cliente",
    action: "replace_column",
    table: "preventivi",
    column: "cliente",
    filter: { columnEq: {} },
    policy: "live",
  },
  "cliente.scheda.ingresso": {
    id: "cliente.scheda.ingresso",
    action: "replace_json",
    table: "scheda_lavorazione",
    jsonPath: "ingresso.campi.cliente",
    filter: { excludeArchivedLavorazioni: true },
    policy: "live",
  },
  "cliente.profiles.cliente_ref": {
    id: "cliente.profiles.cliente_ref",
    action: "replace_column",
    table: "profiles",
    column: "cliente_ref",
    filter: { columnEq: {} },
    policy: "live",
  },
  "cliente.anagrafica.display": {
    id: "cliente.anagrafica.display",
    action: "custom",
    table: "clienti_anagrafiche",
    handler: "cliente.renameNomeDisplay",
    filter: { columnEq: {} },
    policy: "live",
  },
  "cliente.billing.label": {
    id: "cliente.billing.label",
    action: "replace_column",
    table: "billing_customers",
    column: "cliente_label",
    filter: { columnEq: {} },
    policy: "live",
  },
  "cliente.ddt.label_bozza": {
    id: "cliente.ddt.label_bozza",
    action: "replace_column",
    table: "ddt_documents",
    column: "cliente_label",
    filter: { statusIn: ["bozza"] },
    policy: "live",
  },
  "cliente.ddt.label_emessi": {
    id: "cliente.ddt.label_emessi",
    action: "replace_column",
    table: "ddt_documents",
    column: "cliente_label",
    filter: { statusNotIn: ["bozza"] },
    policy: "protected",
  },
  "cliente.alias.old_label": {
    id: "cliente.alias.old_label",
    action: "insert_alias",
    table: "app_settings",
    handler: "entity_resolution.insertAlias",
    filter: {},
    policy: "live",
  },
  "utilizzatore.mezzi": {
    id: "utilizzatore.mezzi",
    action: "replace_column",
    table: "mezzi",
    column: "utilizzatore",
    filter: {},
    policy: "live",
  },
  "utilizzatore.scheda": {
    id: "utilizzatore.scheda",
    action: "replace_json",
    table: "scheda_lavorazione",
    jsonPath: "ingresso.campi.utilizzatore",
    filter: { excludeArchivedLavorazioni: true },
    policy: "live",
  },
  "cantiere.mezzi.meta": {
    id: "cantiere.mezzi.meta",
    action: "replace_json",
    table: "mezzi",
    jsonPath: "meta.cantiere",
    filter: {},
    policy: "live",
  },
  "cantiere.scheda": {
    id: "cantiere.scheda",
    action: "replace_json",
    table: "scheda_lavorazione",
    jsonPath: "ingresso.campi.cantiere",
    filter: { excludeArchivedLavorazioni: true },
    policy: "live",
  },
  "attrezzatura.marca": {
    id: "attrezzatura.marca",
    action: "replace_column",
    table: "attrezzature",
    column: "marca",
    filter: {},
    policy: "live",
  },
  "attrezzatura.modello": {
    id: "attrezzatura.modello",
    action: "replace_column",
    table: "attrezzature",
    column: "modello",
    filter: {},
    policy: "live",
  },
  "attrezzatura.tipo": {
    id: "attrezzatura.tipo",
    action: "replace_column",
    table: "attrezzature",
    column: "tipo_attrezzatura",
    filter: {},
    policy: "live",
  },
  "telaio.marca": {
    id: "telaio.marca",
    action: "replace_column",
    table: "mezzi",
    column: "marca_telaio",
    filter: {},
    policy: "live",
  },
  "telaio.modello": {
    id: "telaio.modello",
    action: "replace_column",
    table: "mezzi",
    column: "modello_telaio",
    filter: {},
    policy: "live",
  },
  "telaio.tipo": {
    id: "telaio.tipo",
    action: "replace_column",
    table: "mezzi",
    column: "tipo_telaio",
    filter: {},
    policy: "live",
  },
  "documenti.marca": {
    id: "documenti.marca",
    action: "replace_column",
    table: "documenti",
    column: "marca",
    filter: {},
    policy: "live",
  },
  "documenti.modello": {
    id: "documenti.modello",
    action: "replace_column",
    table: "documenti",
    column: "modello",
    filter: {},
    policy: "live",
  },
  "ricambi.compat": {
    id: "ricambi.compat",
    action: "custom",
    table: "magazzino_ricambi",
    handler: "ricambi.regenerateCompat",
    filter: {},
    policy: "live",
  },
  "mag.marca": {
    id: "mag.marca",
    action: "replace_column",
    table: "magazzino_ricambi",
    column: "marca",
    filter: {},
    policy: "live",
  },
  "mag.categoria": {
    id: "mag.categoria",
    action: "replace_json",
    table: "magazzino_ricambi",
    jsonPath: "meta.categoria",
    filter: {},
    policy: "live",
  },
  "mag.fornitore": {
    id: "mag.fornitore",
    action: "custom",
    table: "magazzino_ricambi",
    handler: "ricambi.fornitoreAlternativo",
    filter: {},
    policy: "live",
  },
  "mag.produttore": {
    id: "mag.produttore",
    action: "custom",
    table: "magazzino_ricambi",
    handler: "ricambi.produttoreAlternativo",
    filter: {},
    policy: "live",
  },
  "addetto.scheda": {
    id: "addetto.scheda",
    action: "custom",
    table: "scheda_lavorazione",
    handler: "addetto.patchScheda",
    filter: { excludeArchivedLavorazioni: true },
    policy: "live",
  },
};

const KIND_OPERATION_IDS: Record<SettingsRenameKind, readonly string[]> = {
  cliente: [
    "cliente.mezzi.cliente",
    "cliente.preventivi.cliente",
    "cliente.scheda.ingresso",
    "cliente.profiles.cliente_ref",
    "cliente.anagrafica.display",
    "cliente.billing.label",
    "cliente.ddt.label_bozza",
    "cliente.ddt.label_emessi",
    "cliente.alias.old_label",
  ],
  utilizzatore: ["utilizzatore.mezzi", "utilizzatore.scheda"],
  cantiere: ["cantiere.mezzi.meta", "cantiere.scheda"],
  addetto: ["addetto.scheda"],
  mag_marca: ["mag.marca"],
  mag_categoria: ["mag.categoria"],
  mag_fornitore: ["mag.fornitore"],
  mag_produttore: ["mag.produttore"],
  tipo_attrezzatura: ["attrezzatura.tipo"],
  tipo_telaio: ["telaio.tipo"],
  hierarchy_marca_attrezzature: ["attrezzatura.marca", "documenti.marca", "ricambi.compat"],
  hierarchy_modello_attrezzature: ["attrezzatura.modello", "documenti.modello", "ricambi.compat"],
  hierarchy_marca_telai: ["telaio.marca", "documenti.marca", "ricambi.compat"],
  hierarchy_modello_telai: ["telaio.modello", "documenti.modello", "ricambi.compat"],
};

export function getOperationIdsForKind(kind: SettingsRenameKind): readonly string[] {
  return KIND_OPERATION_IDS[kind] ?? [];
}

export function resolveOperations(operationIds: readonly string[]): RenameOperation[] {
  return operationIds.map((id) => {
    const op = RENAME_OPERATIONS[id];
    if (!op) throw new Error(`Unknown rename operation: ${id}`);
    return op;
  });
}

/** Matrice kind → operationIds per audit statico. */
export function renameCoverageMatrix(): Record<SettingsRenameKind, readonly string[]> {
  return { ...KIND_OPERATION_IDS };
}
