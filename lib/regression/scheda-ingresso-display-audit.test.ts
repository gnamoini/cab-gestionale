/**
 * Audit statico: superfici di visualizzazione Scheda Ingresso e componenti collegati.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const panoramica = read("components/gestionale/lavorazioni/scheda-ingresso-panoramica-view.tsx");
const hub = read("components/lavorazioni/schede/schede-lavorazione-modal.tsx");
const lavorazioniView = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
const mobileCard = read("components/gestionale/lavorazioni/lavorazione-mobile-card.tsx");
const kanban = read("components/gestionale/lavorazioni/lavorazioni-kanban-view.tsx");
const clientDialog = read("components/lavorazioni-clienti/client-lavorazione-ingresso-dialog.tsx");
const pdfLayout = read("lib/pdf/ingresso-pdf-layout.ts");
const displayHelpers = read("lib/lavorazioni/lavorazione-display-helpers.ts");

const SCHEDA_FIELDS = [
  "dataIngresso",
  "cliente",
  "cantiere",
  "utilizzatore",
  "richiedente",
  "tipoAttrezzatura",
  "marcaAttrezzatura",
  "modelloAttrezzatura",
  "matricola",
  "nScuderia",
  "oreLavoro",
  "tipoTelaio",
  "marcaTelaio",
  "modelloTelaio",
  "targa",
  "km",
  "livelloCarburante",
  "descrizioneAnomalia",
  "noteIntervento",
  "addettoAccettazione",
] as const;

for (const key of SCHEDA_FIELDS) {
  assert.match(panoramica, new RegExp(`fields\\.${key}`), `panoramica must show fields.${key}`);
}

assert.match(panoramica, /whitespace-pre-wrap/, "panoramica multiline fields use pre-wrap");
assert.match(panoramica, /multilineValue\(fields\.descrizioneAnomalia\)/);
assert.match(panoramica, /multilineValue\(fields\.noteIntervento\)/);

assert.match(clientDialog, /SchedaIngressoPanoramicaView/);
assert.match(hub, /SchedaIngressoPanoramicaAnagraficaContent/);
assert.match(hub, /noteIntervento/);

assert.match(lavorazioniView, /lavorazioneNoteOperative/);
assert.match(lavorazioniView, /line-clamp-2/);
assert.match(mobileCard, /LavorazioneMobileNote/);
assert.match(mobileCard, /line-clamp-2/);
assert.match(kanban, /lavorazioneNoteOperative/);

assert.match(displayHelpers, /noteIntervento/, "note column uses noteIntervento not descrizioneAnomalia");
assert.doesNotMatch(displayHelpers, /descrizioneAnomalia/);

assert.match(pdfLayout, /multiline: true/);
assert.match(pdfLayout, /descrizioneAnomalia/);
assert.match(pdfLayout, /noteIntervento/);

console.log("scheda-ingresso-display-audit.test.ts OK");
