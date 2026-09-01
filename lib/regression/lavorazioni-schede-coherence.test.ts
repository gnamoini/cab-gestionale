/**
 * Coerenza SSOT: Scheda di Ingresso ↔ tabella ↔ filtri ↔ canonical resolver.
 */
import assert from "node:assert/strict";
import { composeInterventoContextFromListRow } from "@/lib/domain/intervento-context/build-intervento-context";
import { resolveInterventoCanonical } from "@/lib/domain/intervento-context/resolve-intervento-canonical";
import { resolveInterventoDisplay } from "@/lib/domain/intervento-context/resolve-intervento-display";
import { resolveInterventoOggettoDisplay } from "@/lib/domain/mezzo-attrezzatura/intervento-oggetto-display";
import { mergeSchedaIngressoWithMezzoPriority } from "@/lib/schede/merge-scheda-ingresso-with-mezzo-priority";
import { resolveIdentificazioneMacchinaFromContext } from "@/lib/schede/resolve-identificazione-macchina";
import { identificazionePartsFromInterventoDisplay } from "@/lib/mezzi/identificazione-mezzo";
import { lavorazioneOggettoCellLines } from "@/lib/lavorazioni/lavorazioni-list-row-labels";
import { resolveLavorazioneContextWithAttrezzatura } from "@/lib/lavorazioni/resolve-lavorazione-context-with-attrezzatura";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MezzoRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";

function emptyIngressoCampi(over: Partial<SchedaIngressoFields> = {}): SchedaIngressoFields {
  return {
    dataIngresso: "",
    cliente: "",
    cantiere: "",
    utilizzatore: "",
    tipoAttrezzatura: "",
    marcaAttrezzatura: "",
    modelloAttrezzatura: "",
    matricola: "",
    nScuderia: "",
    oreLavoro: "",
    tipoTelaio: "",
    marcaTelaio: "",
    modelloTelaio: "",
    vin: "",
    targa: "",
    km: "",
    descrizioneAnomalia: "",
    livelloCarburante: "",
    addettoAccettazione: "",
    richiedente: "",
    richiedenteTelefono: "",
    ...over,
  };
}

function doppstadtRow(): {
  row: LavorazioneListRow;
  store: LavorazioneSchedeStore;
} {
  const attId = "att-doppstadt";
  const mezzo: MezzoRow = {
    id: "m-1",
    cliente: "Cliente Test",
    utilizzatore: "Util",
    marca: "Doppstadt",
    modello: "Cilindro",
    targa: "AA000BB",
    matricola: "MAT-CAT",
    numero_scuderia: null,
    tipo_attrezzatura: "Cilindro",
    marca_telaio: null,
    modello_telaio: null,
    tipo_telaio: null,
    telaio_num: null,
    anno: 2020,
    meta: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as MezzoRow;

  const row: LavorazioneListRow = {
    id: "lav-doppstadt",
    codice: "26-0099",
    mezzo_id: "m-1",
    attrezzatura_id: attId,
    target_type: "attrezzatura",
    stato: "accettazione",
    priorita: "media",
    data_ingresso: "2026-06-01",
    data_uscita: null,
    note: null,
    created_by: null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    mezzo,
  } as LavorazioneListRow;

  const store: LavorazioneSchedeStore = {
    "lav-doppstadt": {
      lavorazioneId: "lav-doppstadt",
      codice: "26-0099",
      ingresso: {
        tipo: "ingresso",
        sorgente: "generata",
        createdAt: "2026-06-01T00:00:00Z",
        updatedAt: "2026-06-01T00:00:00Z",
        createdBy: "op",
        updatedBy: "op",
        fileEsterno: null,
        campi: emptyIngressoCampi({ marcaAttrezzatura: "", modelloAttrezzatura: "" }),
      },
      lavorazioni: null,
      ricambi: null,
    },
  };

  return { row, store };
}

function filterMarca(row: LavorazioneListRow, store: LavorazioneSchedeStore): string {
  const ctx = composeInterventoContextFromListRow(row, store);
  return resolveInterventoDisplay(ctx).marcaAttrezzatura.value;
}

// Caso Doppstadt — scheda presente + marca vuota → nessun fallback catalogo in UI
{
  const { row, store } = doppstadtRow();
  const ctx = composeInterventoContextFromListRow(row, store);
  const canonical = resolveInterventoCanonical("ui", { lavorazioneRow: row, schedeStore: store });
  const oggetto = lavorazioneOggettoCellLines(row, store);
  const portal = resolveLavorazioneContextWithAttrezzatura(row, store);

  assert.equal(canonical.display.marcaAttrezzatura.value, "", "canonical marca");
  assert.equal(filterMarca(row, store), "", "filter marca");
  assert.equal(oggetto.primary, "—", "table oggetto primary");
  assert.equal(portal.attrezzaturaLine, "—", "portal attrezzatura line");
  assert.equal(resolveInterventoOggettoDisplay(ctx).label, "", "oggetto display label");

  const editorRaw = store["lav-doppstadt"]!.ingresso!.campi.marcaAttrezzatura;
  assert.equal(editorRaw, "", "editor raw scheda before hydrate");

  const hydrated = mergeSchedaIngressoWithMezzoPriority(store["lav-doppstadt"]!.ingresso!.campi, {
    linkedMezzo: {
      id: "m-1",
      cliente: "Cliente Test",
      utilizzatore: "Util",
      marca: "Doppstadt",
      modello: "Cilindro",
      targa: "AA000BB",
      matricola: "MAT-CAT",
      tipoAttrezzatura: "Cilindro",
      anno: 2020,
      oreKm: 0,
      km: 0,
      statoAttuale: "Operativo",
      dataUltimaUscita: "—",
      note: "",
      priorita: "normale",
      hubSynthetic: false,
    },
    prefillPolicy: "edit_hydrate",
  });
  assert.equal(hydrated.marcaAttrezzatura, "Doppstadt", "editor hydrate explicit");
}

// Scheda vince su catalogo
{
  const { row, store } = doppstadtRow();
  store["lav-doppstadt"]!.ingresso!.campi.marcaAttrezzatura = "X";
  store["lav-doppstadt"]!.ingresso!.campi.modelloAttrezzatura = "Model-X";

  const canonical = resolveInterventoCanonical("ui", { lavorazioneRow: row, schedeStore: store });
  const oggetto = lavorazioneOggettoCellLines(row, store);

  assert.equal(canonical.display.marcaAttrezzatura.value, "X");
  assert.equal(canonical.display.modelloAttrezzatura.value, "Model-X");
  assert.ok(oggetto.primary.includes("X"), "table shows scheda X not Doppstadt");
}

// Catalog contradiction — scheda Haller vs attrezzatura Doppstadt vs mezzo Farid
{
  const mezzo: MezzoRow = {
    id: "m-cc",
    cliente: "Cliente Test",
    utilizzatore: "Util",
    marca: "Farid",
    modello: "Model-F",
    targa: "AA111BB",
    matricola: "MAT",
    numero_scuderia: null,
    tipo_attrezzatura: "Tipo",
    marca_telaio: "Telaio-F",
    modello_telaio: "ModT-F",
    tipo_telaio: null,
    telaio_num: null,
    anno: 2020,
    meta: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as MezzoRow;

  const row: LavorazioneListRow = {
    id: "lav-cc",
    codice: "26-0100",
    mezzo_id: "m-cc",
    attrezzatura_id: "att-cc",
    target_type: "attrezzatura",
    stato: "accettazione",
    priorita: "media",
    data_ingresso: "2026-06-01",
    data_uscita: null,
    note: null,
    created_by: null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    mezzo,
  } as LavorazioneListRow;

  const campi = emptyIngressoCampi({
    marcaAttrezzatura: "Haller",
    modelloAttrezzatura: "Model-H",
    marcaTelaio: "Telaio-H",
    modelloTelaio: "ModT-H",
  });

  const store: LavorazioneSchedeStore = {
    "lav-cc": {
      lavorazioneId: "lav-cc",
      codice: "26-0100",
      ingresso: {
        tipo: "ingresso",
        sorgente: "generata",
        createdAt: "2026-06-01T00:00:00Z",
        updatedAt: "2026-06-01T00:00:00Z",
        createdBy: "op",
        updatedBy: "op",
        fileEsterno: null,
        campi,
      },
      lavorazioni: null,
      ricambi: null,
    },
  };

  const ctx = composeInterventoContextFromListRow(row, store);
  const ui = resolveInterventoCanonical("ui", { lavorazioneRow: row, schedeStore: store });
  const exp = resolveInterventoCanonical("export", {
    lavorazioneRow: row,
    schedeStore: store,
    ingressoCampi: campi,
  });
  const table = lavorazioneOggettoCellLines(row, store);
  const detail = resolveLavorazioneContextWithAttrezzatura(row, store);
  const ident = resolveIdentificazioneMacchinaFromContext(ctx);
  const hydrated = mergeSchedaIngressoWithMezzoPriority(campi, {
    linkedMezzo: {
      id: "m-cc",
      cliente: "Cliente Test",
      utilizzatore: "Util",
      marca: "Doppstadt",
      modello: "Model-D",
      targa: "AA111BB",
      matricola: "MAT",
      tipoAttrezzatura: "Tipo",
      anno: 2020,
      oreKm: 0,
      km: 0,
      statoAttuale: "Operativo",
      dataUltimaUscita: "—",
      note: "",
      priorita: "normale",
      hubSynthetic: false,
    },
    prefillPolicy: "edit_hydrate",
  });

  assert.equal(ui.display.marcaAttrezzatura.value, "Haller", "canonical marca");
  assert.equal(ui.display.modelloAttrezzatura.value, "Model-H", "canonical modello");
  assert.equal(ui.display.marcaTelaio.value, "Telaio-H", "canonical marcaTelaio");
  assert.equal(filterMarca(row, store), "Haller", "filter marca");
  assert.ok(table.primary.includes("Haller"), "table marca");
  assert.ok(detail.attrezzaturaLine.includes("Haller"), "detail marca");
  assert.equal(exp.exportFields.marcaAttrezzatura, "Haller", "export marca");
  assert.equal(exp.exportFields.modelloAttrezzatura, "Model-H", "export modello");
  assert.equal(exp.exportFields.marcaTelaio, "Telaio-H", "export marcaTelaio");
  assert.ok(ident.includes("Haller"), "ricambi ident marca");
  assert.equal(hydrated.marcaAttrezzatura, "Haller", "editor hydrate keeps scheda");

  // Ricambi UI: canonical identParts vince su legacy persistito Doppstadt
  const identParts = identificazionePartsFromInterventoDisplay(ui.display);
  const legacyPersisted = "Doppstadt Model-D";
  assert.ok(identParts.marcaAttrezzatura?.includes("Haller"), "ricambi identParts marca");
  assert.notEqual(legacyPersisted, identParts.marcaAttrezzatura, "legacy differs from canonical");
}

// Scheda assente — bootstrap catalogo (caso C)
{
  const { row } = doppstadtRow();
  const canonical = resolveInterventoCanonical("ui", { lavorazioneRow: row, schedeStore: {} });
  assert.equal(canonical.display.marcaAttrezzatura.value, "Doppstadt", "bootstrap from catalog when no scheda");
}

// Identificazione macchina da canonical
{
  const { row, store } = doppstadtRow();
  store["lav-doppstadt"]!.ingresso!.campi.marcaAttrezzatura = "X";
  store["lav-doppstadt"]!.ingresso!.campi.targa = "T1";
  const ctx = composeInterventoContextFromListRow(row, store);
  const ident = resolveIdentificazioneMacchinaFromContext(ctx);
  assert.ok(ident.includes("X"), "ident includes scheda marca");
  assert.ok(ident.includes("T1"), "ident includes scheda targa");
}

// Export alignment con flat fields
{
  const { row, store } = doppstadtRow();
  store["lav-doppstadt"]!.ingresso!.campi.marcaAttrezzatura = "MarcaScheda";
  const ui = resolveInterventoCanonical("ui", { lavorazioneRow: row, schedeStore: store });
  const exp = resolveInterventoCanonical("export", {
    lavorazioneRow: row,
    schedeStore: store,
    ingressoCampi: store["lav-doppstadt"]!.ingresso!.campi,
  });
  assert.equal(exp.exportFields.marcaAttrezzatura, "MarcaScheda");
  assert.equal(ui.display.marcaAttrezzatura.value, "MarcaScheda");
}

console.log("lavorazioni-schede-coherence.test.ts OK");
