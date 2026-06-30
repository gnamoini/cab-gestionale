import "server-only";

import type { ImportEntity, ImportFieldDef } from "@/lib/data-import/core/types";
import type { ImportEntityPlugin } from "@/lib/data-import/core/import-plugin";
import { generateImportTemplateXlsx } from "@/lib/data-import/core/template-generator.server";
import type { FieldPatternSet } from "@/lib/data-import/core/column-mapper";

function createStubPlugin(input: {
  id: ImportEntity;
  routeSlug: string;
  label: string;
  fields: ImportFieldDef[];
  permission: ImportEntityPlugin["permission"];
  uiEntry?: ImportEntityPlugin["uiEntry"];
}): ImportEntityPlugin {
  const emptyPatterns: FieldPatternSet = Object.fromEntries(input.fields.map((f) => [f.key, [new RegExp(f.label, "i")]]));
  return {
    id: input.id,
    routeSlug: input.routeSlug,
    label: input.label,
    status: "stub",
    fields: input.fields,
    patterns: emptyPatterns,
    supportedStrategies: ["initial"],
    defaultStrategy: "initial",
    duplicateRules: { defaultAction: "skip" },
    allowedDuplicateActions: ["skip"],
    allowedRowActions: ["skip"],
    rowLabelKeys: [input.fields[0]?.key ?? "id"],
    templateFilename: `template-import-${input.routeSlug}.xlsx`,
    permission: input.permission,
    uiEntry: input.uiEntry,

    async parseFile() {
      throw new Error(`Import ${input.label} in preparazione — disponibile in una release successiva.`);
    },
    async buildPreview() {
      throw new Error(`Import ${input.label} in preparazione — disponibile in una release successiva.`);
    },
    async execute() {
      throw new Error(`Import ${input.label} in preparazione — disponibile in una release successiva.`);
    },
    buildDecisionsFromPreview() {
      return [];
    },
    generateTemplate() {
      return generateImportTemplateXlsx(input.fields, { sheetName: input.label });
    },
  };
}

export const lavorazioniImportPluginStub = createStubPlugin({
  id: "lavorazioni",
  routeSlug: "lavorazioni",
  label: "Lavorazioni",
  fields: [
    { key: "codice", label: "Codice", required: true },
    { key: "cliente", label: "Cliente", required: true },
    { key: "mezzo_targa", label: "Targa mezzo" },
  ],
  permission: { kind: "module", module: "lavorazioni" },
  uiEntry: { section: "lavorazioni", placement: "toolbar" },
});

export const fattureDraftImportPluginStub = createStubPlugin({
  id: "fatture_draft",
  routeSlug: "fatture",
  label: "Fatture (bozze)",
  fields: [
    { key: "numero", label: "Numero" },
    { key: "cliente", label: "Cliente", required: true },
    { key: "totale", label: "Totale" },
  ],
  permission: { kind: "module", module: "fatturazione" },
  uiEntry: { section: "fatturazione", placement: "toolbar" },
});

export const billingCustomersImportPluginStub = createStubPlugin({
  id: "billing_customers",
  routeSlug: "billing-customers",
  label: "Clienti fatturazione",
  fields: [{ key: "cliente_label", label: "Cliente", required: true }, { key: "partita_iva", label: "P.IVA" }],
  permission: { kind: "module", module: "fatturazione" },
});

export const documentiMetadataImportPluginStub = createStubPlugin({
  id: "documenti_metadata",
  routeSlug: "documenti-metadata",
  label: "Documenti (metadati)",
  fields: [
    { key: "titolo", label: "Titolo", required: true },
    { key: "categoria", label: "Categoria" },
    { key: "marca", label: "Marca" },
  ],
  permission: { kind: "module", module: "documenti" },
  uiEntry: { section: "documenti", placement: "toolbar" },
});

export const dipendentiTimesheetImportPluginStub = createStubPlugin({
  id: "dipendenti_timesheet",
  routeSlug: "dipendenti",
  label: "Dipendenti timesheet",
  fields: [
    { key: "nome", label: "Nome dipendente", required: true },
    { key: "data", label: "Data" },
    { key: "ore", label: "Ore" },
  ],
  permission: { kind: "module", module: "dipendenti" },
  uiEntry: { section: "dipendenti", placement: "toolbar" },
});
