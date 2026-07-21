import assert from "node:assert/strict";
import { assertCaptureLavorazioneLinked } from "@/lib/document-capture/patch-capture-lavorazione-link.client";

assert.throws(() => assertCaptureLavorazioneLinked(null, "lav-1"), /non collegata/);
assert.throws(
  () => assertCaptureLavorazioneLinked({ lavorazione_id: "lav-2" }, "lav-1"),
  /non corrisponde/,
);
assert.doesNotThrow(() => assertCaptureLavorazioneLinked({ lavorazione_id: "lav-1" }, "lav-1"));

console.log("patch-capture-lavorazione-link.client.test.ts OK");
