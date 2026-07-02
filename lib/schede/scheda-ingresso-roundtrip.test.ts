/**
 * Round-trip audit: normalizzazione, clamp e payload DB per SchedaIngressoFields.
 */
import assert from "node:assert/strict";
import { bundleToSchedaPayloads } from "@/lib/schede/schede-db-mapper";
import { clampSchedeBundle } from "@/lib/validation/clamp-free-text";
import { lavorazioneNoteOperative } from "@/lib/lavorazioni/lavorazione-display-helpers";
import { TEXT_EXTRA, TEXT_LONG } from "@/lib/validation/text-field-limits";
import {
  applySchedaIngressoTypedFields,
  copySchedaIngressoFieldFromClient,
  isSchedaIngressoFieldEmpty,
  type SchedaIngressoStringKey,
} from "@/lib/schede/scheda-ingresso-typed-fields";
import type { LavorazioneSchedeBundle, SchedaIngressoFields } from "@/types/schede";

const MULTILINE_ANOMALIA = "Riga 1\nRiga 2\n\nRiga 4 àèù & < > \" '";
const MULTILINE_NOTE = "Nota\nseconda riga\temoji 🛠";

function emptySchedaIngressoFields(addettoDefault = ""): SchedaIngressoFields {
  return {
    dataIngresso: "08/06/2026",
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
    targa: "",
    km: "",
    descrizioneAnomalia: "",
    livelloCarburante: "",
    addettoAccettazione: addettoDefault,
    richiedente: "",
    noteIntervento: "",
  };
}

/** Mirror di normalizeSchedaIngressoFields (scheda-ingresso-form-modal). */
function normalizeSchedaIngressoFields(
  raw: Partial<SchedaIngressoFields> | null | undefined,
  addettoDefault = "",
): SchedaIngressoFields {
  const base = emptySchedaIngressoFields(addettoDefault);
  if (!raw) return base;
  const out = { ...base };
  for (const key of Object.keys(base) as SchedaIngressoStringKey[]) {
    const v = raw[key];
    if (v !== undefined && v !== null) out[key] = String(v);
  }
  applySchedaIngressoTypedFields(out, raw);
  return out;
}

function fullCampi(overrides: Partial<SchedaIngressoFields> = {}): SchedaIngressoFields {
  return {
    ...emptySchedaIngressoFields("Addetto Test"),
    cliente: "Cliente Audit",
    cantiere: "Cantiere Nord",
    utilizzatore: "Utilizzatore A",
    richiedente: "Richiedente B",
    tipoAttrezzatura: "Escavatore",
    marcaAttrezzatura: "CAT",
    modelloAttrezzatura: "320",
    matricola: "MAT-AUDIT",
    nScuderia: "42",
    oreLavoro: "1500.5",
    tipoTelaio: "Gommati",
    marcaTelaio: "CAT",
    modelloTelaio: "320 GC",
    targa: "AA111BB",
    km: "12000",
    livelloCarburante: "3/4",
    descrizioneAnomalia: MULTILINE_ANOMALIA,
    noteIntervento: MULTILINE_NOTE,
    ...overrides,
  };
}

const campi = fullCampi();
const { cliente: _omitCliente, ...partialWithoutCliente } = campi;
const normalized = normalizeSchedaIngressoFields(
  { ...partialWithoutCliente, dataIngresso: "09/06/2026" },
  "Default Addetto",
);
assert.equal(normalized.cliente, "", "normalize: omitted keys fall back to empty default");
assert.equal(normalized.dataIngresso, "09/06/2026");
assert.equal(normalized.addettoAccettazione, "Addetto Test");
assert.equal(normalized.matricola, "MAT-AUDIT", "normalize: provided keys preserved");

const legacy = normalizeSchedaIngressoFields({ matricola: "LEG-1", descrizioneAnomalia: "solo anomalia" });
assert.equal(legacy.matricola, "LEG-1");
assert.equal(legacy.descrizioneAnomalia, "solo anomalia");
assert.equal(legacy.cliente, "");

const bundle: LavorazioneSchedeBundle = {
  lavorazioneId: "lav-audit-1",
  codice: "26-0099",
  ingresso: {
    tipo: "ingresso",
    sorgente: "generata",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-08T12:00:00.000Z",
    createdBy: "Tester",
    updatedBy: "Tester",
    fileEsterno: null,
    campi,
  },
  lavorazioni: null,
  ricambi: null,
};

const clamped = clampSchedeBundle(bundle);
assert.ok(clamped.ingresso);
assert.equal(clamped.ingresso!.campi.livelloCarburante, "75%");
assert.equal(clamped.ingresso!.campi.descrizioneAnomalia, MULTILINE_ANOMALIA);
assert.equal(clamped.ingresso!.campi.noteIntervento, MULTILINE_NOTE);

const longAnomalia = "x".repeat(TEXT_EXTRA + 50);
const longNote = "n".repeat(TEXT_LONG + 50);
const clampedLong = clampSchedeBundle({
  ...bundle,
  ingresso: {
    ...bundle.ingresso!,
    campi: { ...campi, descrizioneAnomalia: longAnomalia, noteIntervento: longNote },
  },
});
assert.equal(clampedLong.ingresso!.campi.descrizioneAnomalia.length, TEXT_EXTRA);
assert.equal(clampedLong.ingresso!.campi.noteIntervento.length, TEXT_LONG);

const payloads = bundleToSchedaPayloads(clamped);
assert.equal(payloads.length, 1);
assert.equal(payloads[0]!.tipo, "ingresso");
const doc = (payloads[0]!.contenuto as { doc: { campi: SchedaIngressoFields } }).doc;
assert.equal(doc.campi.descrizioneAnomalia, MULTILINE_ANOMALIA);
assert.equal(doc.campi.noteIntervento, MULTILINE_NOTE);
assert.equal(doc.campi.cliente, "Cliente Audit");

const noteFromScheda = lavorazioneNoteOperative(
  { id: "lav-audit-1", note: "fallback row note" },
  { "lav-audit-1": clamped },
);
assert.equal(noteFromScheda, MULTILINE_NOTE);
assert.equal(
  lavorazioneNoteOperative({ id: "lav-audit-1", note: "solo row" }, {}),
  "solo row",
);

console.log("scheda-ingresso-roundtrip.test.ts OK");
