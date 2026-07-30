import assert from "node:assert/strict";
import {
  SCHEDA_OFFICINA_EXTRACTION_SYSTEM,
  SCHEDA_OFFICINA_EXTRACTION_USER,
  SCHEDA_OFFICINA_HYBRID_PREFILL_USER_PREFIX,
} from "@/lib/document-capture/scheda-officina-extraction-prompt";

const CRITICAL_KEYS = [
  "schedaTipo",
  "data_ingresso",
  "cliente",
  "targa",
  "descrizione_anomalia",
  "riga_1_lavorazione",
  "riga_1_codice",
  "confidence",
];

for (const key of CRITICAL_KEYS) {
  assert.ok(
    SCHEDA_OFFICINA_EXTRACTION_SYSTEM.includes(key) || SCHEDA_OFFICINA_EXTRACTION_USER.includes(key),
    `missing critical token: ${key}`,
  );
}

assert.ok(SCHEDA_OFFICINA_HYBRID_PREFILL_USER_PREFIX.includes("pre-estratti"));
assert.ok(SCHEDA_OFFICINA_EXTRACTION_SYSTEM.length < 2200, "prompt should be condensed");

console.log("scheda-officina-extraction-prompt.test.ts OK");
