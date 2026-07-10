import "server-only";

import type { ImportEntity } from "@/lib/data-import/core/types";
import type { ImportExportPluginDefinition } from "@/lib/data-import/core/plugin-definition";
import { legacyFieldToExportField } from "@/lib/data-import/core/field-schema";
import { recordsToNormalizedSheet } from "@/lib/data-import/core/snapshot-provider";
import { computeSchemaHash } from "@/lib/data-import/core/template-compatibility";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

function withSnapshot(
  def: ImportExportPluginDefinition,
  patch: Partial<ImportExportPluginDefinition>,
): ImportExportPluginDefinition {
  return { ...def, ...patch };
}

function flatSnapshotFromTable(
  def: ImportExportPluginDefinition,
  table: string,
  sheetName: string,
  select: string,
  scopeFilter?: (scope: Record<string, unknown>) => Record<string, unknown>,
) {
  return withSnapshot(def, {
    exportSinks: ["xlsx", "csv", "zip"],
    snapshotProvider: {
      strategy: "single_query",
      async fetch(ctx) {
        const sb = await createSupabaseServerUserClient();
        let q = sb.from(table).select(select);
        const sf = scopeFilter?.(ctx.scope ?? {});
        if (sf) {
          for (const [k, v] of Object.entries(sf)) {
            q = q.eq(k, v);
          }
        }
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        const records = ((data ?? []) as unknown) as Record<string, unknown>[];
        const fields = def.fields.map((f) => ({ key: f.key, label: f.label }));
        return {
          entity: def.id,
          pluginVersion: def.pluginVersion,
          templateVersion: def.templateVersion,
          schemaHash: computeSchemaHash(def.fields, ctx.mode),
          source: "spreadsheet" as const,
          exportMode: ctx.mode,
          sheets: [recordsToNormalizedSheet(sheetName, "parent", fields, records)],
          metadata: { mode: ctx.mode, rowCount: records.length },
        };
      },
    },
  });
}

const MEZZI_EXPORT_FIELDS = [
  { key: "id", label: "ID", dataType: "uuid" as const, importWritable: false },
  { key: "cliente", label: "Cliente", required: true },
  { key: "targa", label: "Targa" },
  { key: "matricola", label: "Matricola" },
  { key: "numero_scuderia", label: "N. scuderia" },
  { key: "anno", label: "Anno", dataType: "number" as const },
  { key: "cantiere", label: "Cantiere" },
  { key: "utilizzatore", label: "Utilizzatore" },
  { key: "telaio_num", label: "VIN / Telaio" },
  { key: "created_at", label: "Creato il", group: "audit" as const, importWritable: false },
  { key: "updated_at", label: "Aggiornato il", group: "concurrency" as const, importWritable: false },
];

const MAGAZZINO_EXPORT_FIELDS = [
  { key: "id", label: "ID", importWritable: false },
  { key: "codice", label: "Codice", required: true },
  { key: "nome", label: "Descrizione", required: true },
  { key: "marca", label: "Marca" },
  { key: "quantita", label: "Quantità", dataType: "number" as const },
  { key: "costo", label: "Costo", dataType: "number" as const },
  { key: "prezzo_vendita", label: "Prezzo vendita", dataType: "number" as const },
  { key: "created_at", label: "Creato il", importWritable: false },
  { key: "updated_at", label: "Aggiornato il", importWritable: false },
];

export function registerV3EntityProviders(
  v3Plugins: Map<ImportEntity, ImportExportPluginDefinition>,
  slugIndex: Map<string, ImportEntity>,
): void {
  const mezziBase = v3Plugins.get("mezzi");
  if (mezziBase) {
    const fields = MEZZI_EXPORT_FIELDS.map((f) => ({
      ...legacyFieldToExportField({ key: f.key, label: f.label, required: f.required }),
      ...f,
      exportIncluded: { backup: true, importable: f.importWritable !== false },
    }));
    const mezziDef = withSnapshot(
      { ...mezziBase, fields, pluginVersion: "mezzi-import@2.0.0", templateVersion: "2.0" },
      {},
    );
    const enhanced = flatSnapshotFromTable(
      mezziDef,
      "mezzi",
      "Mezzi",
      "id, cliente, targa, matricola, numero_scuderia, anno, cantiere, utilizzatore, telaio_num, created_at, updated_at",
    );
    v3Plugins.set("mezzi", enhanced);
  }

  const magBase = v3Plugins.get("magazzino_ricambi");
  if (magBase) {
    const fields = MAGAZZINO_EXPORT_FIELDS.map((f) => ({
      ...legacyFieldToExportField({ key: f.key, label: f.label, required: f.required }),
      ...f,
      exportIncluded: { backup: true, importable: f.importWritable !== false },
    }));
    const magDef = withSnapshot(
      { ...magBase, fields, pluginVersion: "magazzino-import@2.0.0", templateVersion: "2.0" },
      {},
    );
    const enhanced = flatSnapshotFromTable(
      magDef,
      "magazzino_ricambi",
      "Magazzino",
      "id, codice, nome, marca, quantita, costo, prezzo_vendita, created_at, updated_at",
    );
    v3Plugins.set("magazzino_ricambi", enhanced);
  }

  // Preventivi relazionale
  registerPreventiviProvider(v3Plugins);
  registerOrdiniProvider(v3Plugins, slugIndex);
  registerLavorazioniProvider(v3Plugins);
  registerFatturazioneProvider(v3Plugins);
}

function registerPreventiviProvider(v3Plugins: Map<ImportEntity, ImportExportPluginDefinition>) {
  const base = v3Plugins.get("preventivi");
  if (!base) return;
  const fields = [
    ...base.fields.map(legacyFieldToExportField),
    { key: "id", label: "ID", importWritable: false },
    { key: "updated_at", label: "Aggiornato il", importWritable: false },
  ];
  const def: ImportExportPluginDefinition = {
    ...base,
    fields,
    pluginVersion: "preventivi-import@2.0.0",
    templateVersion: "2.0",
    exportSinks: ["xlsx", "csv"],
    relationalSheets: [{ parentSheet: "Preventivi", childSheet: "Preventivi_Righe", fkField: "preventivo_id", maxDepth: 2 }],
    snapshotProvider: {
      strategy: "transactional",
      async fetch(ctx) {
        const sb = await createSupabaseServerUserClient();
        const { data: prev, error } = await sb.from("preventivi").select("id, mezzo_id, cliente, totale, stato, dettagli, created_at, updated_at");
        if (error) throw new Error(error.message);
        const parentFields = [
          { key: "id", label: "ID" },
          { key: "cliente", label: "Cliente" },
          { key: "totale", label: "Totale" },
          { key: "stato", label: "Stato" },
          { key: "updated_at", label: "Aggiornato il" },
        ];
        const parents = (prev ?? []) as Record<string, unknown>[];
        const childRecords: Record<string, unknown>[] = [];
        for (const p of parents) {
          const det = p.dettagli as { righe?: Record<string, unknown>[] } | null;
          for (const r of det?.righe ?? []) {
            childRecords.push({
              preventivo_id: p.id,
              ...r,
            });
          }
        }
        const childFields = [
          { key: "preventivo_id", label: "Preventivo ID" },
          { key: "descrizione", label: "Descrizione" },
          { key: "quantita", label: "Quantità" },
          { key: "prezzo", label: "Prezzo" },
        ];
        return {
          entity: "preventivi",
          pluginVersion: def.pluginVersion,
          templateVersion: def.templateVersion,
          schemaHash: computeSchemaHash(def.fields, ctx.mode),
          source: "spreadsheet",
          exportMode: ctx.mode,
          sheets: [
            recordsToNormalizedSheet("Preventivi", "parent", parentFields, parents),
            recordsToNormalizedSheet("Preventivi_Righe", "child", childFields, childRecords, {
              parentSheetName: "Preventivi",
              fkField: "preventivo_id",
            }),
          ],
          metadata: { mode: ctx.mode },
        };
      },
    },
  };
  v3Plugins.set("preventivi", def);
}

function registerOrdiniProvider(
  v3Plugins: Map<ImportEntity, ImportExportPluginDefinition>,
  slugIndex: Map<string, ImportEntity>,
) {
  const id = "ordini_fornitori" as ImportEntity;
  const def: ImportExportPluginDefinition = {
    id,
    routeSlug: "ordini-fornitori",
    label: "Ordini fornitori",
    status: "active",
    pageKey: "preventivi",
    pluginVersion: "ordini-import@1.0.0",
    templateVersion: "1.0",
    fields: [
      legacyFieldToExportField({ key: "id", label: "ID" }),
      legacyFieldToExportField({ key: "numero", label: "Numero", required: true }),
      legacyFieldToExportField({ key: "fornitore_label", label: "Fornitore" }),
      legacyFieldToExportField({ key: "data_ordine", label: "Data ordine" }),
      legacyFieldToExportField({ key: "totale", label: "Totale" }),
      legacyFieldToExportField({ key: "updated_at", label: "Aggiornato il" }),
    ],
    permission: { kind: "module", module: "ordini_fornitori" },
    templateFilename: "template-import-ordini.xlsx",
    templateSheetName: "Ordini",
    dataSources: ["spreadsheet", "ai_extraction"],
    exportSinks: ["xlsx", "csv"],
    relationalSheets: [{ parentSheet: "Ordini", childSheet: "Ordini_Righe", fkField: "ordine_id", maxDepth: 2 }],
    mergePolicy: { default: "PATCH" },
    recoveryProvider: { capability: "NONE" },
    snapshotProvider: {
      strategy: "transactional",
      async fetch(ctx) {
        const sb = await createSupabaseServerUserClient();
        const { data: ordini, error } = await sb
          .from("ordini_fornitori")
          .select("id, numero, fornitore_label, data_ordine, totale, updated_at");
        if (error) throw new Error(error.message);
        const parents = (ordini ?? []) as Record<string, unknown>[];
        const ids = parents.map((o) => o.id).filter(Boolean);
        let righe: Record<string, unknown>[] = [];
        if (ids.length) {
          const { data: r, error: re } = await sb
            .from("ordini_fornitori_righe")
            .select("id, ordine_id, codice, descrizione, quantita, prezzo_unitario")
            .in("ordine_id", ids);
          if (re) throw new Error(re.message);
          righe = (r ?? []) as Record<string, unknown>[];
        }
        return {
          entity: id,
          pluginVersion: def.pluginVersion,
          templateVersion: def.templateVersion,
          schemaHash: computeSchemaHash(def.fields, ctx.mode),
          source: "spreadsheet",
          exportMode: ctx.mode,
          sheets: [
            recordsToNormalizedSheet(
              "Ordini",
              "parent",
              def.fields.map((f) => ({ key: f.key, label: f.label })),
              parents,
            ),
            recordsToNormalizedSheet(
              "Ordini_Righe",
              "child",
              [
                { key: "ordine_id", label: "Ordine ID" },
                { key: "codice", label: "Codice" },
                { key: "descrizione", label: "Descrizione" },
                { key: "quantita", label: "Quantità" },
                { key: "prezzo_unitario", label: "Prezzo unit." },
              ],
              righe,
              { parentSheetName: "Ordini", fkField: "ordine_id" },
            ),
          ],
          metadata: { mode: ctx.mode },
        };
      },
    },
    uiEntry: { section: "ordini-fornitori", placement: "toolbar" },
  };
  v3Plugins.set(id, def);
  slugIndex.set(def.routeSlug, id);
}

function registerLavorazioniProvider(v3Plugins: Map<ImportEntity, ImportExportPluginDefinition>) {
  const base = v3Plugins.get("lavorazioni");
  if (!base) return;
  const def = flatSnapshotFromTable(
    {
      ...base,
      status: "active",
      pluginVersion: "lavorazioni-import@1.0.0",
      templateVersion: "1.0",
      exportSinks: ["xlsx", "csv"],
      fields: [
        legacyFieldToExportField({ key: "id", label: "ID" }),
        legacyFieldToExportField({ key: "codice", label: "Codice" }),
        legacyFieldToExportField({ key: "stato", label: "Stato" }),
        legacyFieldToExportField({ key: "archived", label: "Archiviata" }),
        legacyFieldToExportField({ key: "created_at", label: "Creato il" }),
        legacyFieldToExportField({ key: "updated_at", label: "Aggiornato il" }),
      ],
    },
    "lavorazioni",
    "Lavorazioni",
    "id, codice, stato, archived, created_at, updated_at, deleted_at",
    (scope) => {
      const out: Record<string, unknown> = { deleted_at: null };
      if (scope.archived === true) out.archived = true;
      else if (scope.archived === false) out.archived = false;
      return out;
    },
  );
  v3Plugins.set("lavorazioni", def);
}

function registerFatturazioneProvider(v3Plugins: Map<ImportEntity, ImportExportPluginDefinition>) {
  const base = v3Plugins.get("fatture_draft");
  if (!base) return;
  const def: ImportExportPluginDefinition = {
    ...base,
    status: "active",
    pluginVersion: "fatture-import@1.0.0",
    templateVersion: "1.0",
    exportSinks: ["xlsx", "csv"],
    relationalSheets: [{ parentSheet: "Fatture", childSheet: "Fatture_Righe", fkField: "invoice_id", maxDepth: 2 }],
    fields: [
      legacyFieldToExportField({ key: "id", label: "ID" }),
      legacyFieldToExportField({ key: "numero", label: "Numero" }),
      legacyFieldToExportField({ key: "anno", label: "Anno" }),
      legacyFieldToExportField({ key: "cliente_label", label: "Cliente" }),
      legacyFieldToExportField({ key: "totale", label: "Totale" }),
      legacyFieldToExportField({ key: "document_status", label: "Stato documento" }),
      legacyFieldToExportField({ key: "updated_at", label: "Aggiornato il" }),
    ],
    snapshotProvider: {
      strategy: "transactional",
      async fetch(ctx) {
        const sb = await createSupabaseServerUserClient();
        const { data: inv, error } = await sb
          .from("invoices")
          .select("id, numero, anno, cliente_label, totale, document_status, updated_at");
        if (error) throw new Error(error.message);
        const parents = (inv ?? []) as Record<string, unknown>[];
        const ids = parents.map((p) => p.id).filter(Boolean);
        let righe: Record<string, unknown>[] = [];
        if (ids.length) {
          const { data: r, error: re } = await sb
            .from("invoice_rows")
            .select("id, invoice_id, descrizione, quantita, prezzo_unitario, imponibile")
            .in("invoice_id", ids);
          if (re) throw new Error(re.message);
          righe = (r ?? []) as Record<string, unknown>[];
        }
        return {
          entity: "fatture_draft",
          pluginVersion: def.pluginVersion,
          templateVersion: def.templateVersion,
          schemaHash: computeSchemaHash(def.fields, ctx.mode),
          source: "spreadsheet",
          exportMode: ctx.mode,
          sheets: [
            recordsToNormalizedSheet(
              "Fatture",
              "parent",
              def.fields.map((f) => ({ key: f.key, label: f.label })),
              parents,
            ),
            recordsToNormalizedSheet(
              "Fatture_Righe",
              "child",
              [
                { key: "invoice_id", label: "Fattura ID" },
                { key: "descrizione", label: "Descrizione" },
                { key: "quantita", label: "Quantità" },
                { key: "prezzo_unitario", label: "Prezzo unit." },
                { key: "imponibile", label: "Imponibile" },
              ],
              righe,
              { parentSheetName: "Fatture", fkField: "invoice_id" },
            ),
          ],
          metadata: { mode: ctx.mode },
        };
      },
    },
  };
  v3Plugins.set("fatture_draft", def);
}
