import assert from "node:assert/strict";
import { composeMezzoGestitoFromRows } from "@/lib/domain/mezzo-attrezzatura/compose-mezzo-gestito";
import {
  buildClientPortalRowFields,
  clientPortalCantiereLabel,
} from "@/lib/lavorazioni/client-portal-row-fields";
import {
  buildClientTimelineHeader,
  resolveClientPortalSchedaIngressoFields,
} from "@/lib/lavorazioni/client-portal-timeline";
import { resolveLavorazioneContextWithAttrezzatura } from "@/lib/lavorazioni/resolve-lavorazione-context-with-attrezzatura";
import { mezzoGestitoToEmbedRow } from "@/lib/mezzi/mezzi-attrezzature-batch";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { AttrezzaturaRow, MezzoRow } from "@/src/types/supabase-tables";

const baseMezzo: MezzoRow = {
  id: "m1",
  cliente: "Cliente A",
  utilizzatore: null,
  targa: "AB123CD",
  marca_telaio: "Iveco",
  modello_telaio: "Daily",
  tipo_telaio: "Furgone",
  numero_scuderia: null,
  km: null,
  anno: 2020,
  note: null,
  meta: null,
  entity_key: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
};

const att1: AttrezzaturaRow = {
  id: "a1",
  mezzo_id: "m1",
  marca: "Cat",
  modello: "320",
  matricola: "MAT-1",
  tipo_attrezzatura: "Escavatore",
  portata: null,
  anno: 2020,
  note: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  created_by: null,
};

const att2: AttrezzaturaRow = {
  ...att1,
  id: "a2",
  marca: "Volvo",
  modello: "EC220",
  matricola: "MAT-2",
  created_at: "2024-01-02T00:00:00Z",
};

function enrichedEmbed(att: AttrezzaturaRow): MezzoRow {
  return mezzoGestitoToEmbedRow(composeMezzoGestitoFromRows(baseMezzo, att));
}

function lavRow(
  targetType: "telaio" | "attrezzatura",
  attrezzaturaId: string | null,
  mezzo: MezzoRow,
): LavorazioneListRow {
  return {
    id: "l1",
    mezzo_id: "m1",
    stato: "accettazione",
    priorita: "normale",
    data_ingresso: "2024-06-01",
    data_uscita: null,
    note: null,
    created_by: null,
    created_at: "2024-06-01T10:00:00Z",
    updated_at: "2024-06-01T10:00:00Z",
    updated_by: null,
    archived: false,
    archived_at: null,
    deleted_at: null,
    codice: "LAV-1",
    target_type: targetType,
    attrezzatura_id: attrezzaturaId,
    mezzo,
  };
}

// target_type=telaio
const telaioDisplay = resolveLavorazioneContextWithAttrezzatura(
  lavRow("telaio", null, enrichedEmbed(att1)),
);
assert.equal(telaioDisplay.classification, "TELAIO");
assert.equal(telaioDisplay.attrezzaturaLine, "—");
assert.equal(telaioDisplay.oggettoLabel, "Iveco Daily");
assert.equal(telaioDisplay.telaioLine, "Iveco Daily");
assert.equal(telaioDisplay.oggettoBadge, "TELAIO");

// target_type=attrezzatura + attrezzatura_id → target att, non primary
const attDisplay = resolveLavorazioneContextWithAttrezzatura(
  lavRow("attrezzatura", "a2", enrichedEmbed(att2)),
);
assert.equal(attDisplay.classification, "ATTREZZATURA");
assert.equal(attDisplay.attrezzaturaLine, "Volvo EC220");
assert.notEqual(attDisplay.attrezzaturaLine, "Cat 320");

// COMPOSITO con count > 1
const composito = resolveLavorazioneContextWithAttrezzatura(
  lavRow("attrezzatura", "a2", enrichedEmbed(att2)),
  undefined,
  { attrezzatureCountOnMezzo: 2 },
);
assert.equal(composito.classification, "COMPOSITO");
assert.equal(composito.oggettoBadge, "COMPOSITO");

// Senza scheda: list fields = resolver (consistency list/detail)
const rowEnriched = lavRow("attrezzatura", "a2", enrichedEmbed(att2));
const fields = buildClientPortalRowFields(rowEnriched, {}, [], []);
const direct = resolveLavorazioneContextWithAttrezzatura(rowEnriched);
assert.equal(fields.attrezzatura, direct.oggettoLabel);
assert.equal(fields.entityBadge, direct.oggettoBadge);
assert.equal(fields.targa, direct.ident.targa);

// Mezzo senza attrezzature, target telaio — fail-safe
const soloTelaio = resolveLavorazioneContextWithAttrezzatura(
  lavRow("telaio", null, mezzoGestitoToEmbedRow(composeMezzoGestitoFromRows(baseMezzo, null))),
);
assert.equal(soloTelaio.classification, "TELAIO");
assert.equal(soloTelaio.attrezzaturaLine, "—");
assert.ok(soloTelaio.oggettoLabel.length > 0);

// Fallback scheda: telaio da embed mezzo
const schedaFields = resolveClientPortalSchedaIngressoFields(rowEnriched, {}, [], []);
assert.equal(schedaFields.marcaTelaio, "Iveco");
assert.equal(schedaFields.modelloTelaio, "Daily");
assert.equal(schedaFields.tipoTelaio, "Furgone");
assert.equal(schedaFields.marcaAttrezzatura, "Volvo");
assert.equal(schedaFields.modelloAttrezzatura, "EC220");

const telaioScheda = resolveClientPortalSchedaIngressoFields(
  lavRow("telaio", null, enrichedEmbed(att1)),
  {},
  [],
  [],
);
assert.equal(telaioScheda.marcaAttrezzatura, "");
assert.equal(telaioScheda.modelloAttrezzatura, "");

// Cantiere da mezzo senza scheda ingresso — lista e dettaglio allineati
const mezzoConCantiere = mezzoGestitoToEmbedRow(
  composeMezzoGestitoFromRows({ ...baseMezzo, meta: { cantiere: "Cantiere Nord" } }, att1),
);
const rowCantiere = lavRow("telaio", null, mezzoConCantiere);
const cantiereFields = buildClientPortalRowFields(rowCantiere, {}, [], []);
const cantiereHeader = buildClientTimelineHeader(rowCantiere, {});
assert.equal(cantiereFields.cantiere, "Cantiere Nord");
assert.equal(clientPortalCantiereLabel(rowCantiere, {}), "Cantiere Nord");
assert.equal(cantiereHeader.cantiere, "Cantiere Nord");

// Addetto senza assegnazione — nessun fallback globale
const rowSenzaAddetto = lavRow("telaio", null, enrichedEmbed(att1));
const addettoFields = buildClientPortalRowFields(rowSenzaAddetto, {}, ["Angelo"], [
  { id: "a1", nome: "Angelo", cognome: "Morino" },
]);
assert.equal(addettoFields.addetto, "—");
assert.equal(addettoFields.addettoNome, "—");

console.log("client-portal-v2-display.test.ts OK");
