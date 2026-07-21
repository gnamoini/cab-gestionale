import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const modals = fs.readFileSync(
  path.join(ROOT, "components/gestionale/magazzino/magazzino-modals.tsx"),
  "utf8",
);
const panel = fs.readFileSync(
  path.join(ROOT, "components/gestionale/magazzino/ricambio-info-panel.tsx"),
  "utf8",
);

assert.match(modals, /Carica \+1/);
assert.match(modals, /Scarica −1/);
assert.match(modals, /Lavorazioni/);
assert.match(modals, /Ordini/);
assert.match(panel, /RicambioOperationalStatusCard/);
assert.match(panel, /RicambioMovimentiSection/);
assert.match(panel, /RicambioOrdiniSection/);

console.log("ricambio-scheda-quick-actions.test.ts OK");
