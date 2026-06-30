import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { validateCodiceDestinatario, validatePartitaIva } from "@/lib/clienti/clienti-anagrafica-validation";
import { setSedeLegaleUgualeOperativa } from "@/lib/clienti/clienti-sede-sync";
import { emptyClienteAnagrafica } from "@/lib/clienti/clienti-anagrafica-types";

const ROOT = process.cwd();

assert.equal(validatePartitaIva("12345678901"), null);
assert.equal(validatePartitaIva("123"), "Partita IVA: 11 cifre numeriche.");
assert.equal(validateCodiceDestinatario("ABC1234"), null);
assert.equal(validateCodiceDestinatario("AB"), "Codice destinatario: 7 caratteri alfanumerici.");

let model = emptyClienteAnagrafica("Cliente A", "clientea");
model = {
  ...model,
  sedi: { ...model.sedi, operativa: { ...model.sedi.operativa, via: "Via Roma" } },
};
const synced = setSedeLegaleUgualeOperativa(model, true);
assert.equal(synced.sedi.legale.via, "Via Roma");

const mezziForm = fs.readFileSync(path.join(ROOT, "components/gestionale/mezzi/mezzi-form-fields.tsx"), "utf8");
const preventiviView = fs.readFileSync(path.join(ROOT, "components/preventivi/preventivi-view.tsx"), "utf8");
const pdfAnagrafica = fs.readFileSync(path.join(ROOT, "lib/pdf/anagrafica-pdf-fields.ts"), "utf8");
const pdfFetch = fs.readFileSync(path.join(ROOT, "lib/clienti/clienti-anagrafica-fetch.server.ts"), "utf8");

assert.doesNotMatch(mezziForm, /clienti-anagrafica/);
assert.doesNotMatch(preventiviView, /clienti-anagrafica/);
assert.match(pdfAnagrafica, /buildClienteFiscalePdfFields/);
assert.match(pdfFetch, /fetchClienteAnagraficaByLabelServer/);
assert.doesNotMatch(pdfAnagrafica, /clienti_anagrafiche/);

const settingsList = fs.readFileSync(path.join(ROOT, "components/dashboard/settings/settings-clienti-list.tsx"), "utf8");
assert.match(settingsList, /ClienteAnagraficaHubModal/);
assert.match(settingsList, /Anagrafica/);
assert.match(settingsList, /markRemovedFromLista/);

const migrationSql = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260716120000_clienti_anagrafiche.sql"),
  "utf8",
);
assert.match(migrationSql, /create table if not exists public\.clienti_anagrafiche/);
assert.match(migrationSql, /create unique index if not exists idx_clienti_anagrafiche_entity_key/);
assert.match(migrationSql, /drop policy if exists cap_clienti_anagrafiche_select/);

console.log("clienti-anagrafica-isolation.test.ts OK");
