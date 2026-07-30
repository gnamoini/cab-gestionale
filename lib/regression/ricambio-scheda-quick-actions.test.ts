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
const stepper = fs.readFileSync(
  path.join(ROOT, "components/gestionale/magazzino/magazzino-scorta-debounced-stepper.tsx"),
  "utf8",
);
const riepilogo = fs.readFileSync(
  path.join(ROOT, "components/gestionale/magazzino/ricambio-info-riepilogo-section.tsx"),
  "utf8",
);

assert.match(stepper, /Carica \+1/);
assert.match(stepper, /Scarica −1/);
assert.match(stepper, /grid-cols-\[1fr_auto_1fr\]/);
assert.doesNotMatch(modals, /MagazzinoScortaModalQuickAdjust/);
assert.doesNotMatch(modals, /href="\/lavorazioni"/);
assert.doesNotMatch(modals, /href="\/ordini-fornitori"/);
assert.match(modals, /trailingAction=\{/);

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
assert.match(panel, /MagazzinoScortaDebouncedInfoStepper/);
assert.match(riepilogo, /MagazzinoScortaDebouncedInfoStepper/);
assert.match(riepilogo, /RicambioStockStatusLabel/);
assert.match(riepilogo, /title="Giacenza"/);
assert.match(riepilogo, /title="Classificazione"/);
assert.match(riepilogo, /label="Scorta minima"/);
const codOeIdx = riepilogo.indexOf('label="Cod. OE"');
const marcaIdx = riepilogo.indexOf('label="Marca"');
const descrizioneIdx = riepilogo.indexOf('label="Descrizione"');
const giacenzaSubgroupIdx = riepilogo.indexOf('title="Giacenza"');
const classificazioneIdx = riepilogo.indexOf('title="Classificazione"');
assert.ok(
  codOeIdx >= 0 &&
    marcaIdx > codOeIdx &&
    descrizioneIdx > marcaIdx &&
    giacenzaSubgroupIdx > descrizioneIdx &&
    classificazioneIdx > giacenzaSubgroupIdx,
  "Ordine: Cod. OE → Marca → Descrizione → Giacenza → Classificazione",
);
assert.doesNotMatch(riepilogo, /sm:grid-cols-2[\s\S]*label="Cod\. OE"/);
assert.match(panel, /RicambioOperationalStatusCard[\s\S]*embedded/);
assert.match(panel, /RicambioConsumoDetailRows/);
assert.doesNotMatch(panel, /label="Scorta minima"/);
assert.match(panel, /title="Storico e movimenti"/);
assert.doesNotMatch(panel, /title="Movimenti magazzino"/);
assert.doesNotMatch(panel, /title="Storico modifiche"/);
assert.match(panel, /RicambioOrdiniSection/);

console.log("ricambio-scheda-quick-actions.test.ts OK");
