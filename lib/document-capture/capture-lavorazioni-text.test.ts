import assert from "node:assert/strict";
import {
  coalesceCaptureLavorazioniLines,
  ensureCaptureLavorazioniBulletLines,
  expandCaptureWorkshopAbbreviations,
  formatCaptureLavorazioniText,
  insertCaptureLavorazioniBulletNewline,
} from "@/lib/document-capture/capture-lavorazioni-text";

const workshopSample = `- Ricerca guasto su imp. elettrico innesto pto
Apertura centralina X quadro in cabina
Smont.
N. 2 portafusibili nel vano batteria
E isol.`;

const formatted = formatCaptureLavorazioniText(workshopSample);
assert.equal(
  formatted,
  `- Ricerca guasto su impianto elettrico innesto PTO
- Apertura centralina X quadro in cabina
- Smontaggio N. 2 portafusibili nel vano batteria e isolamento`,
);
assert.equal(formatted.split("\n").length, 3);

assert.deepEqual(
  coalesceCaptureLavorazioniLines(["Smontaggio", "N. 2 portafusibili", "E isolamento"]),
  ["Smontaggio N. 2 portafusibili e isolamento"],
);

assert.equal(
  expandCaptureWorkshopAbbreviations("Smont.\nimp. idraulico"),
  "Smontaggio\nimpianto idraulico",
);

assert.equal(
  ensureCaptureLavorazioniBulletLines("prima\n* seconda\n• terza"),
  "- prima\n- seconda\n- terza",
);
assert.equal(ensureCaptureLavorazioniBulletLines("solo riga"), "solo riga");

const inserted = insertCaptureLavorazioniBulletNewline("- riga uno", "- riga uno".length, "- riga uno".length);
assert.equal(inserted.value, "- riga uno\n- ");
assert.equal(inserted.cursor, "- riga uno".length + 3);

console.log("capture-lavorazioni-text.test.ts OK");
