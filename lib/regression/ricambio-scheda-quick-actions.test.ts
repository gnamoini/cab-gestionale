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
const riepilogo = fs.readFileSync(
  path.join(ROOT, "components/gestionale/magazzino/ricambio-info-riepilogo-section.tsx"),
  "utf8",
);

assert.match(modals, /Carica \+1/);
assert.match(modals, /Scarica −1/);
assert.match(modals, /grid-cols-\[1fr_auto_1fr\]/);
assert.match(modals, /ricambio\.scorta/);
assert.match(modals, /hidden grid-cols-2 gap-2 text-sm sm:grid/);
assert.match(modals, /Lavorazioni/);
assert.match(modals, /Ordini/);

const riepilogoComponentIdx = panel.indexOf("RicambioInfoRiepilogoSection");
const giacenzaIdx = panel.indexOf('title="Giacenza e consumo"');
const datiIdx = panel.indexOf('title="Dati principali"');
assert.match(riepilogo, /title="Riepilogo"/);
assert.match(riepilogo, /persistScope=\{RICAMBIO_SCHEDA_RIEPILOGO_COLLAPSE_SCOPE\}/);
assert.match(riepilogo, /persistKey=\{RICAMBIO_SCHEDA_RIEPILOGO_COLLAPSE_KEY\}/);
assert.ok(
  riepilogoComponentIdx >= 0 && giacenzaIdx >= 0 && datiIdx >= 0 && riepilogoComponentIdx < giacenzaIdx && giacenzaIdx < datiIdx,
  "Riepilogo prima di Giacenza e consumo, poi Dati principali",
);
assert.match(panel, /MagazzinoScortaInfoStepper/);
assert.match(riepilogo, /MagazzinoScortaInfoStepper/);
assert.match(riepilogo, /RicambioStockStatusLabel/);
assert.match(panel, /RicambioOperationalStatusCard[\s\S]*embedded/);
assert.match(panel, /RicambioConsumoDetailRows/);
assert.doesNotMatch(panel, /label="Scorta minima"/);
assert.match(panel, /title="Storico e movimenti"/);
assert.doesNotMatch(panel, /title="Movimenti magazzino"/);
assert.doesNotMatch(panel, /title="Storico modifiche"/);
assert.match(panel, /RicambioOrdiniSection/);

console.log("ricambio-scheda-quick-actions.test.ts OK");
