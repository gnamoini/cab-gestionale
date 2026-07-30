import assert from "node:assert/strict";
import { deriveCaptureCompileProgress } from "@/lib/document-capture/capture-compile-progress";

assert.equal(deriveCaptureCompileProgress("settings").label, "Caricamento impostazioni globali…");
assert.equal(deriveCaptureCompileProgress("fetch_fields").label, "Recupero campi letti dalla scansione…");
assert.equal(deriveCaptureCompileProgress("map_fields").label, "Mappatura campi sulla scheda ingresso…");
assert.equal(deriveCaptureCompileProgress("field_hints").label, "Verifica suggerimenti di compilazione…");
assert.ok(deriveCaptureCompileProgress("field_hints").progress! > deriveCaptureCompileProgress("map_fields").progress!);

console.log("capture-compile-progress.test.ts OK");
