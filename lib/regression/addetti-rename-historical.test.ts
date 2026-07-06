import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { patchAddettoInSchedaContenuto, patchAddettoNomeInSchedaContenuto } from "@/lib/lavorazioni/patch-addetto-in-scheda-contenuto";

const propagationSrc = readFileSync(
  resolve(import.meta.dirname, "../../src/services/settings-rename-propagation.service.ts"),
  "utf8",
);
assert.match(propagationSrc, /archivedLavIds\.has\(lavId\)/, "rename skip su lavorazioni archiviate");
assert.match(propagationSrc, /fromAliases/);
assert.match(propagationSrc, /patchAddettoInSchedaContenuto/);

const archivedIngresso = {
  doc: {
    campi: {
      addettoAccettazione: "Mario",
    },
  },
};

{
  const { next, changed } = patchAddettoNomeInSchedaContenuto("ingresso", archivedIngresso, "Mario", "Luigi");
  assert.equal(changed, true);
  const campi = (next.doc as { campi: { addettoAccettazione: string } }).campi;
  assert.equal(campi.addettoAccettazione, "Luigi", "patch contenuto scheda ingresso");
}

{
  const ingressoFullName = {
    doc: { campi: { addettoAccettazione: "Mario Rossi" } },
  };
  const { next, changed } = patchAddettoInSchedaContenuto(
    "ingresso",
    ingressoFullName,
    ["Mario", "Mario Rossi"],
    "Luigi",
  );
  assert.equal(changed, true);
  const campi = (next.doc as { campi: { addettoAccettazione: string } }).campi;
  assert.equal(campi.addettoAccettazione, "Luigi", "patch anche con nome completo in scheda");
}

console.log("addetti-rename-historical.test.ts OK");
