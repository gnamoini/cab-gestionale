import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { buildEmptyManualPreventivo } from "@/lib/preventivi/build-empty-manual-preventivo";
import {
  isPreventivoVendita,
  PREVENTIVO_CATEGORIA_OPTIONS,
  preventivoCategoriaBadgeLabel,
  resolvePreventivoCategoria,
} from "@/lib/preventivi/preventivo-categoria";
import {
  preventivoRecordToInsert,
  preventivoRowToRecord,
} from "@/lib/preventivi/preventivi-db-mapper";
import { validatePreventivoBeforeSave } from "@/lib/preventivi/preventivo-save-validation";
import { pickPreventivoWritePayload } from "@/lib/validation/services/preventivi-payload";
import type { PreventivoRow } from "@/src/types/supabase-tables";

test("categoria options SSOT: due contesti distinti", () => {
  assert.equal(PREVENTIVO_CATEGORIA_OPTIONS.length, 2);
  assert.equal(PREVENTIVO_CATEGORIA_OPTIONS[0]?.id, "lavorazione");
  assert.equal(PREVENTIVO_CATEGORIA_OPTIONS[1]?.id, "vendita");
  assert.equal(preventivoCategoriaBadgeLabel("vendita", "chip"), "Vend");
  assert.equal(preventivoCategoriaBadgeLabel("lavorazione", "chip"), "Lav");
});

test("categoria esplicita vendita vince su mezzoId", () => {
  assert.equal(
    resolvePreventivoCategoria({
      categoriaPreventivo: "vendita",
      mezzoId: "550e8400-e29b-41d4-a716-446655440099",
      lavorazioneId: "",
    }),
    "vendita",
  );
});

test("categoria esplicita lavorazione vince senza lavorazioneId", () => {
  assert.equal(
    resolvePreventivoCategoria({
      categoriaPreventivo: "lavorazione",
      mezzoId: "",
      lavorazioneId: "",
    }),
    "lavorazione",
  );
});

test("legacy con mezzo inferisce lavorazione", () => {
  assert.equal(
    resolvePreventivoCategoria({
      mezzoId: "550e8400-e29b-41d4-a716-446655440099",
    }),
    "lavorazione",
  );
});

test("vendita draft: isPreventivoVendita e insert senza mezzo", () => {
  const draft = buildEmptyManualPreventivo("Op", [], { categoria: "vendita" });
  draft.cliente = "Cliente Ricambi Srl";
  assert.equal(isPreventivoVendita(draft), true);
  const row = preventivoRecordToInsert(draft, null);
  assert.equal(row.mezzo_id, null);
  assert.equal(row.lavorazione_id, null);
  assert.equal(row.stato_workflow, "bozza");
  assert.equal((row.dettagli as Record<string, unknown>).categoriaPreventivo, "vendita");
  const picked = pickPreventivoWritePayload(row as Record<string, unknown>);
  assert.equal(picked.mezzo_id, null);
  assert.equal(picked.stato_workflow, "bozza");
});

test("validazione: cliente obbligatorio", () => {
  const draft = buildEmptyManualPreventivo("Op", [], { categoria: "vendita" });
  assert.equal(validatePreventivoBeforeSave(draft), "Il cliente è obbligatorio.");
});

test("validazione: vendita senza mezzo OK", () => {
  const draft = buildEmptyManualPreventivo("Op", [], { categoria: "vendita" });
  draft.cliente = "ACME";
  assert.equal(validatePreventivoBeforeSave(draft), null);
});

test("validazione: lavorazione senza mezzo né ident KO", () => {
  const draft = buildEmptyManualPreventivo("Op", [], { categoria: "lavorazione" });
  draft.cliente = "ACME";
  const err = validatePreventivoBeforeSave(draft);
  assert.ok(err && /mezzo/i.test(err));
});

test("round-trip DB vendita senza mezzo", () => {
  const draft = buildEmptyManualPreventivo("Op", [], { categoria: "vendita" });
  draft.cliente = "Cliente Test";
  const ins = preventivoRecordToInsert(draft, null);
  const row: PreventivoRow = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    mezzo_id: null,
    lavorazione_id: null,
    cliente: "Cliente Test",
    totale: 0,
    dettagli: ins.dettagli as Record<string, unknown>,
    stato_workflow: "bozza",
    versione: 1,
    parent_preventivo_id: null,
    current_pdf_artifact_id: null,
    pdf_sent_artifact_id: null,
    pdf_sent_hash: null,
    pdf_sent_generated_at: null,
    inviato_at: null,
    visualizzato_at: null,
    annullato_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const record = preventivoRowToRecord(row, null);
  assert.equal(isPreventivoVendita(record), true);
  assert.equal(record.cliente, "Cliente Test");
  assert.equal(record.mezzoId, undefined);
});

test("vendita con sole righe manodopera: mapper accetta righeRicambi vuote dopo struttura", () => {
  const draft = buildEmptyManualPreventivo("Op", [], { categoria: "vendita" });
  draft.cliente = "Servizi";
  draft.righeRicambi = [];
  draft.manodopera = {
    ...draft.manodopera,
    oreTotali: 2,
    prezzoOrario: 50,
    righeAddetti: [{ addettoId: null, ore: 2 }],
  };
  const ins = preventivoRecordToInsert(draft, null);
  const righe = (ins.dettagli as Record<string, unknown>).righeRicambi;
  assert.ok(Array.isArray(righe));
});

test("migration vendita: mezzo nullable, invio senza lavorazione, token solo con lavorazione", () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20261302150000_preventivi_vendita_nullable_mezzo.sql"),
    "utf8",
  );
  assert.match(sql, /alter column mezzo_id drop not null/i);
  assert.doesNotMatch(sql, /Lavorazione obbligatoria per invio preventivo/);
  assert.match(sql, /if v_row\.lavorazione_id is not null then/i);
  assert.doesNotMatch(sql, /alter column lavorazione_id drop not null/i);
});
